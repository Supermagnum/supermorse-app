// Copyright The Mumble Developers. All rights reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file at the root of the
// Mumble source tree or at <https://www.mumble.info/LICENSE>.

#include "Server.h"
#include "ServerApplication.h"
#include "database/MariaDBConnectionParameter.h"

#include <QtCore/QCoreApplication>
#include <QtCore/QSettings>
#include <QtCore/QTextCodec>
#include <QtCore/QDateTime>
#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QTimer>
#include <QtCore/QRegularExpression>
#include <QtCore/QCommandLineParser>
#include <QtNetwork/QSslSocket>
#include <QtNetwork/QHostAddress>

/**
 * @brief Main entry point for the Supermorse Mumble Server
 * 
 * This is an enhanced version of the main.cpp file that properly initializes
 * the server with HF band simulation features and provides better error handling.
 */
int main(int argc, char **argv) {
    // Initialize the application
    QCoreApplication a(argc, argv);
    a.setApplicationName("Supermorse Mumble Server");
    a.setApplicationVersion("1.0.0");
    a.setOrganizationName("Supermorse");
    a.setOrganizationDomain("supermorse.org");
    
    // Parse command line arguments
    QCommandLineParser parser;
    parser.setApplicationDescription("Supermorse Mumble Server with HF band simulation");
    parser.addHelpOption();
    parser.addVersionOption();
    
    // Add config file option
    QCommandLineOption configOption(QStringList() << "c" << "config", 
                                   "Specify the configuration file to use", 
                                   "file", 
                                   "mumble-server.ini");
    parser.addOption(configOption);
    
    // Add database file option
    QCommandLineOption dbOption(QStringList() << "d" << "database", 
                               "Specify the database file to use", 
                               "file", 
                               "supermorse-mumble.sqlite");
    parser.addOption(dbOption);
    
    // Process the command line arguments
    parser.process(a);
    
    // Get the configuration file path
    QString configFile = parser.value(configOption);
    QString dbFile = parser.value(dbOption);
    
    // Set up logging
    qWarning() << "Supermorse Mumble Server starting...";
    qWarning() << "Using configuration file:" << configFile;
    qWarning() << "Using database file:" << dbFile;
    
    // Create the server application
    ServerApplication serverApp(&a);
    
    // Start the server application
    if (!serverApp.start()) {
        qWarning() << "Failed to start the server application.";
        return 1;
    }
    
    // Load configuration
    QSettings qs(configFile, QSettings::IniFormat);
    
    // Create the database connection parameter for MariaDB
    mumble::db::MariaDBConnectionParameter connectionParam("supermorse");
    connectionParam.userName = "supermorse";
    connectionParam.password = "supermorse";
    connectionParam.host = "localhost";
    connectionParam.port = "3306";
    
    qWarning() << "Using MariaDB database:" << QString::fromStdString(connectionParam.dbName);
    
    // Create and initialize the server
    // The server number is 1 (we only have one server instance)
    Server *server = new Server(1, connectionParam, &a);
    
    try {
        // Initialize the server
        server->initialize();
        
        // Log server information
        qWarning() << "Server initialized successfully.";
        qWarning() << "Server name:" << server->qsRegName;
        qWarning() << "Max users:" << server->iMaxUsers;
        
        // Check if HF band simulation is enabled
        QSettings qs(configFile, QSettings::IniFormat);
        qs.beginGroup("hf_propagation");
        bool hfEnabled = qs.value("enabled", true).toBool();
        
        // Read external data source settings
        bool useExternalData = qs.value("use_external_data", true).toBool();
        bool useDXViewData = qs.value("use_dxview_data", true).toBool();
        bool useSWPCData = qs.value("use_swpc_data", true).toBool();
        int updateInterval = qs.value("update_interval", 30).toInt();
        qs.endGroup();
        
        if (hfEnabled) {
            qWarning() << "HF band simulation is enabled.";
            
            // Configure external data sources
            if (useExternalData) {
                qWarning() << "External data sources are enabled:";
                qWarning() << "  - DXView.org data:" << (useDXViewData ? "enabled" : "disabled");
                qWarning() << "  - SWPC data:" << (useSWPCData ? "enabled" : "disabled");
                qWarning() << "  - Update interval:" << updateInterval << "minutes";
                
                // Set external data source settings
                server->m_hfBandSimulation.setUseExternalData(useExternalData);
                server->m_hfBandSimulation.setUseDXViewData(useDXViewData);
                server->m_hfBandSimulation.setUseSWPCData(useSWPCData);
            } else {
                qWarning() << "External data sources are disabled. Using internal simulation model.";
            }
            
            // Update propagation initially
            server->updateHFBandPropagation();
            
            qWarning() << "Initial propagation update completed.";
        } else {
            qWarning() << "HF band simulation is disabled.";
        }
        
        // Start the server
        qWarning() << "Supermorse Mumble Server started successfully.";
        
        // Run the application
        return a.exec();
    } catch (const std::exception &e) {
        qWarning() << "Error initializing server:" << e.what();
        return 1;
    } catch (...) {
        qWarning() << "Unknown error initializing server.";
        return 1;
    }
}