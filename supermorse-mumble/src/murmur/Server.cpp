// Copyright The Mumble Developers. All rights reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file at the root of the
// Mumble source tree or at <https://www.mumble.info/LICENSE>.

#include "Server.h"
#include "HFBandSimulation.h"
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
#include <QtNetwork/QSslSocket>
#include <QtNetwork/QHostAddress>

// This is a simplified version of the Server.cpp file
// In a real implementation, this would include all the functionality
// from the original Server.cpp file, with modifications for HF band simulation

Server::Server(unsigned int snum, const ::mumble::db::ConnectionParameter &connectionParam, QObject *parent) : QThread(parent), iServerNum(snum), m_dbWrapper(connectionParam), m_hfBandSimulation(this) {
    // Initialize the server
    qsRegName = "Supermorse Mumble Server";
}

Server::~Server() {
    // No cleanup needed for HFBandSimulation as it's an object member now
}

void Server::initialize() {
    // Initialize the server
    
    // Load configuration
    QSettings qs("mumble-server.ini", QSettings::IniFormat);
    
    // Set up channels from configuration
    setupChannels(qs);
    
    // Initialize the HF band simulation
    initializeHFBandSimulation();
}

void Server::setupChannels(QSettings &qs) {
    // Set up channels from configuration
    qs.beginGroup("channels");
    QStringList channels = qs.childKeys();
    
    for (const QString &key : channels) {
        int id = key.toInt();
        QString name = qs.value(key).toString();
        
        // Create the channel
        Channel *c = new Channel(id, name);
        qhChannels.insert(id, c);
    }
    
    // Set up channel links
    qs.endGroup();
    qs.beginGroup("channel_links");
    QStringList links = qs.childKeys();
    
    for (const QString &key : links) {
        int id = key.toInt();
        QStringList linkedChannels = qs.value(key).toString().split(",");
        
        Channel *c = qhChannels.value(id);
        if (c) {
            for (const QString &linkedId : linkedChannels) {
                Channel *linked = qhChannels.value(linkedId.toInt());
                if (linked) {
                    c->qsPermLinks.insert(linked->iId);
                }
            }
        }
    }
    
    // Set up channel descriptions
    qs.endGroup();
    qs.beginGroup("channel_description");
    QStringList descriptions = qs.childKeys();
    
    for (const QString &key : descriptions) {
        int id = key.toInt();
        QString description = qs.value(key).toString();
        
        Channel *c = qhChannels.value(id);
        if (c) {
            c->qsDesc = description;
        }
    }
    
    qs.endGroup();
}

void Server::initializeHFBandSimulation() {
    // Initialize the HF band simulation
    m_hfBandSimulation.initialize();
    
    // Load propagation parameters from configuration
    QSettings qs("mumble-server.ini", QSettings::IniFormat);
    qs.beginGroup("hf_propagation");
    
    // Check if HF band simulation is enabled
    bool enabled = qs.value("enabled", true).toBool();
    if (!enabled) {
        qWarning() << "HF band simulation is disabled in configuration";
        qs.endGroup();
        return;
    }
    
    // Set external data source settings
    bool useExternalData = qs.value("use_external_data", false).toBool();
    m_hfBandSimulation.setUseExternalData(useExternalData);
    
    if (useExternalData) {
        // Set DXView.org data settings
        bool useDXViewData = qs.value("use_dxview_data", false).toBool();
        m_hfBandSimulation.setUseDXViewData(useDXViewData);
        
        // Set SWPC data settings
        bool useSWPCData = qs.value("use_swpc_data", false).toBool();
        m_hfBandSimulation.setUseSWPCData(useSWPCData);
        
        qWarning() << "HF band simulation using external data sources:"
                  << "DXView.org:" << (useDXViewData ? "enabled" : "disabled")
                  << "SWPC:" << (useSWPCData ? "enabled" : "disabled");
    }
    
    // Set solar flux index (default: 120)
    int sfi = qs.value("solar_flux_index", 120).toInt();
    m_hfBandSimulation.setSolarFluxIndex(sfi);
    
    // Set K-index (default: 3)
    int kIndex = qs.value("k_index", 3).toInt();
    m_hfBandSimulation.setKIndex(kIndex);
    
    // Set season (0=Winter, 1=Spring, 2=Summer, 3=Fall, default: auto)
    bool autoSeason = qs.value("auto_season", true).toBool();
    if (autoSeason) {
        m_hfBandSimulation.setAutoTimeEnabled(true);
    } else {
        int season = qs.value("season", 0).toInt();
        m_hfBandSimulation.setSeason(season);
        m_hfBandSimulation.setAutoTimeEnabled(false);
    }
    
    // Set update interval (default: 30 minutes)
    int updateInterval = qs.value("update_interval", 30).toInt();
    QTimer *timer = new QTimer(this);
    connect(timer, &QTimer::timeout, this, &Server::updateHFBandPropagation);
    timer->start(updateInterval * 60 * 1000); // Convert minutes to milliseconds
    
    qs.endGroup();
    
    // Connect signals and slots for propagation updates
    connect(&m_hfBandSimulation, &HFBandSimulation::propagationUpdated, this, &Server::onPropagationUpdated);
    connect(&m_hfBandSimulation, &HFBandSimulation::signalStrengthChanged, this, &Server::onSignalStrengthChanged);
    connect(&m_hfBandSimulation, &HFBandSimulation::mufChanged, this, &Server::onMUFChanged);
    connect(&m_hfBandSimulation, &HFBandSimulation::externalDataUpdated, this, &Server::onExternalDataUpdated);
    
    // Initial propagation update
    updateHFBandPropagation();
}

void Server::onPropagationUpdated() {
    // This method is called when propagation conditions change
    // Update the server state based on the new propagation conditions
    
    // Get current propagation conditions
    int sfi = m_hfBandSimulation.solarFluxIndex();
    int kIndex = m_hfBandSimulation.kIndex();
    int season = m_hfBandSimulation.season();
    QString seasonName;
    
    switch (season) {
        case 0: seasonName = "Winter"; break;
        case 1: seasonName = "Spring"; break;
        case 2: seasonName = "Summer"; break;
        case 3: seasonName = "Fall"; break;
        default: seasonName = "Unknown"; break;
    }
    
    // Create a detailed message about propagation conditions
    QString message = QString("Propagation conditions updated: Solar Flux Index: %1, K-Index: %2, Season: %3")
                        .arg(sfi).arg(kIndex).arg(seasonName);
    
    // Log the update
    qWarning() << "HF Propagation updated:" << message;
    
    // Notify users of the updated propagation conditions
    foreach(ServerUser *u, qhUsers) {
        if (u->sState == ServerUser::Authenticated) {
            sendMessage(u, message);
            
            // If user has a grid locator, send band recommendations
            QString grid = u->qsMetadata.value("maidenheadgrid", "").toString();
            if (!grid.isEmpty()) {
                sendBandRecommendations(u, grid);
            }
        }
    }
    
    // Update channel links based on propagation
    updateChannelLinks();
}

void Server::onSignalStrengthChanged(const QString &grid1, const QString &grid2, float strength) {
    // This method is called when the signal strength between two grid locators changes
    qWarning() << "Signal strength changed between" << grid1 << "and" << grid2 << ":" << strength;
    
    // Find users with these grid locators and update their audio routing
    foreach(ServerUser *u1, qhUsers) {
        if (u1->sState == ServerUser::Authenticated) {
            QString u1Grid = u1->qsMetadata.value("maidenheadgrid", "").toString();
            if (u1Grid == grid1) {
                foreach(ServerUser *u2, qhUsers) {
                    if (u2->sState == ServerUser::Authenticated && u1 != u2) {
                        QString u2Grid = u2->qsMetadata.value("maidenheadgrid", "").toString();
                        if (u2Grid == grid2) {
                            // Update audio routing between these users
                            updateAudioRouting(u1, u2);
                        }
                    }
                }
            }
        }
    }
}

void Server::onMUFChanged(float muf) {
    // This method is called when the Maximum Usable Frequency changes
    qWarning() << "Maximum Usable Frequency changed:" << muf << "MHz";
    
    // Notify users of the MUF change
    QString message = QString("Maximum Usable Frequency changed: %1 MHz").arg(muf);
    
    foreach(ServerUser *u, qhUsers) {
        if (u->sState == ServerUser::Authenticated) {
            sendMessage(u, message);
        }
    }
}

void Server::sendMessage(ServerUser *u, const QString &message) {
    // Send a text message to a user
    MumbleProto::TextMessage mptm;
    mptm.set_actor(0);
    mptm.set_message(message.toStdString());
    mptm.add_session(u->uiSession);
    
    // In a real implementation, this would use the actual sendMessage method
    // For this simplified version, we'll just log the message
    qWarning() << "Sending message to user" << u->qsName << ":" << message;
}

bool Server::canCommunicate(ServerUser *u1, ServerUser *u2) {
    // Check if two users can communicate based on HF band simulation
    return m_hfBandSimulation.canCommunicate(u1, u2);
}

float Server::calculatePropagation(ServerUser *u1, ServerUser *u2) {
    // Calculate the propagation between two users
    return m_hfBandSimulation.calculatePropagation(u1, u2);
}

float Server::calculateSignalStrength(const QString &grid1, const QString &grid2) {
    // Calculate the signal strength between two grid locators
    return m_hfBandSimulation.calculateSignalStrength(grid1, grid2);
}

int Server::recommendBand(float distance) {
    // Recommend a band for a given distance
    return m_hfBandSimulation.recommendBand(distance);
}

void Server::userStateChanged(ServerUser *u) {
    // This method is called when a user's state changes
    // Update the user's state and notify other users as needed
    
    // Check if the user has a grid locator in their metadata
    QString grid = u->qsMetadata.value("maidenheadgrid", "").toString();
    if (!grid.isEmpty()) {
        // Validate the grid locator format (should be 4 or 6 characters)
        QRegularExpression gridRegex("^[A-R]{2}[0-9]{2}([a-x]{2})?$");
        if (!gridRegex.match(grid).hasMatch()) {
            // Invalid grid locator format
            sendMessage(u, QString("Warning: Invalid Maidenhead grid locator format: %1. Please use format like 'AB12' or 'AB12cd'.").arg(grid));
            return;
        }
        
        // User has a valid grid locator, update propagation
        qWarning() << "User" << u->qsName << "has grid locator:" << grid;
        
        // Send band recommendations to the user
        sendBandRecommendations(u, grid);
        
        // Update audio routing for this user with all other users
        foreach(ServerUser *other, qhUsers) {
            if (other->sState == ServerUser::Authenticated && other != u) {
                updateAudioRouting(u, other);
            }
        }
        
        // Update propagation for all users
        updateHFBandPropagation();
    } else {
        // User doesn't have a grid locator, send a reminder
        sendMessage(u, "Please set your Maidenhead grid locator in your profile for HF band simulation.");
    }
    
    // Check if the user has a preferred HF band in their metadata
    QString preferredBand = u->qsMetadata.value("preferredhfband", "").toString();
    if (!preferredBand.isEmpty()) {
        qWarning() << "User" << u->qsName << "has preferred HF band:" << preferredBand;
        
        // Move the user to their preferred band channel if it exists
        bool ok;
        int bandId = preferredBand.toInt(&ok);
        if (ok && qhChannels.contains(bandId)) {
            Channel *c = qhChannels.value(bandId);
            if (c) {
                // In a real implementation, this would move the user to the channel
                qWarning() << "Moving user" << u->qsName << "to preferred band channel:" << c->qsName;
            }
        }
    }
}

void Server::updateHFBandPropagation() {
    // Update the HF band propagation for all users
    // This is called when a user's state changes or
    // when propagation conditions change
    
    // Update the HF band simulation
    m_hfBandSimulation.updatePropagation();
    
    // Update audio routing for all users
    foreach(ServerUser *u1, qhUsers) {
        if (u1->sState == ServerUser::Authenticated) {
            foreach(ServerUser *u2, qhUsers) {
                if (u2->sState == ServerUser::Authenticated && u1 != u2) {
                    updateAudioRouting(u1, u2);
                }
            }
        }
    }
}

void Server::updateAudioRouting(ServerUser *u1, ServerUser *u2) {
    // Update the audio routing between two users based on propagation
    
    // Check if the users can communicate
    bool canTalk = canCommunicate(u1, u2);
    
    // Get the signal strength between the users
    QString grid1 = u1->qsMetadata.value("maidenheadgrid", "").toString();
    QString grid2 = u2->qsMetadata.value("maidenheadgrid", "").toString();
    
    if (!grid1.isEmpty() && !grid2.isEmpty()) {
        float strength = calculateSignalStrength(grid1, grid2);
        
        // Log the audio routing update
        qWarning() << "Audio routing between" << u1->qsName << "and" << u2->qsName
                  << ": Can communicate:" << canTalk << ", Signal strength:" << strength;
        
        // In a real implementation, this would update the audio routing
        // between the users based on the propagation
        
        // For this implementation, we'll just simulate signal fading
        // based on the signal strength
        if (canTalk) {
            // Apply signal fading based on strength
            // This would be done in the audio processing pipeline
            // For now, we'll just log it
            qWarning() << "Applying signal fading of" << (1.0f - strength) * 100.0f << "% between"
                      << u1->qsName << "and" << u2->qsName;
        }
    }
}

void Server::updateChannelLinks() {
    // Update channel links based on current propagation conditions
    
    // Get current propagation conditions
    int sfi = m_hfBandSimulation.solarFluxIndex();
    int kIndex = m_hfBandSimulation.kIndex();
    
    // Determine which bands are open based on conditions
    QList<int> openBands;
    
    // High solar activity opens higher bands
    if (sfi > 150) {
        // Good conditions for 10m, 12m, 15m
        openBands << 10 << 12 << 15;
    } else if (sfi > 100) {
        // Moderate conditions for 15m, 17m, 20m
        openBands << 15 << 17 << 20;
    } else {
        // Poor conditions, lower bands only
        openBands << 40 << 80 << 160;
    }
    
    // High K-index disrupts higher bands
    if (kIndex > 5) {
        // Remove higher bands during geomagnetic disturbances
        openBands.removeAll(10);
        openBands.removeAll(12);
        openBands.removeAll(15);
    }
    
    // Log the open bands
    QString openBandsStr;
    for (int band : openBands) {
        openBandsStr += QString::number(band) + "m, ";
    }
    if (!openBandsStr.isEmpty()) {
        openBandsStr.chop(2); // Remove trailing comma and space
    }
    qWarning() << "Open bands based on propagation:" << openBandsStr;
    
    // In a real implementation, this would update the channel links
    // based on the open bands
}

void Server::sendBandRecommendations(ServerUser *u, const QString &grid) {
    // Send band recommendations to a user based on their grid locator
    
    // Get current time
    QDateTime now = QDateTime::currentDateTime();
    bool isDaytime = m_hfBandSimulation.calculateSolarZenithAngle(grid, now) < 90.0f;
    
    // Create a message with band recommendations
    QString message = QString("Band recommendations for %1 (%2):\n").arg(grid).arg(isDaytime ? "Day" : "Night");
    
    // Get solar conditions
    int sfi = m_hfBandSimulation.solarFluxIndex();
    int kIndex = m_hfBandSimulation.kIndex();
    
    // Add solar conditions to the message
    message += QString("Solar Flux Index: %1, K-Index: %2\n").arg(sfi).arg(kIndex);
    
    // Recommend bands based on time of day and solar conditions
    if (isDaytime) {
        if (sfi > 150) {
            message += "Excellent conditions for DX on higher bands.\n";
            message += "Recommended bands: 10m, 12m, 15m, 17m, 20m";
        } else if (sfi > 100) {
            message += "Good conditions for DX on mid-range bands.\n";
            message += "Recommended bands: 15m, 17m, 20m, 30m";
        } else {
            message += "Fair conditions, focus on lower bands.\n";
            message += "Recommended bands: 20m, 30m, 40m";
        }
    } else {
        message += "Nighttime conditions favor lower bands.\n";
        message += "Recommended bands: 40m, 80m, 160m";
        
        // During solar maximum, 20m can stay open at night
        if (sfi > 150) {
            message += ", 20m";
        }
    }
    
    // Send the message to the user
    sendMessage(u, message);
}