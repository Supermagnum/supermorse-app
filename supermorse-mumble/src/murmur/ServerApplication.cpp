// Copyright The Mumble Developers. All rights reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file at the root of the
// Mumble source tree or at <https://www.mumble.info/LICENSE>.

#include "ServerApplication.h"

#include <QtCore/QCoreApplication>
#include <QtCore/QDebug>

ServerApplication::ServerApplication(QCoreApplication *app)
    : QObject(app), m_app(app) {
}

ServerApplication::~ServerApplication() {
}

bool ServerApplication::start() {
    qWarning() << "ServerApplication: Starting server...";
    
    // In a real implementation, this would initialize the server
    // and set up signal handlers for graceful shutdown
    
    return true;
}

void ServerApplication::stop() {
    qWarning() << "ServerApplication: Stopping server...";
    
    // In a real implementation, this would gracefully shut down the server
    
    m_app->quit();
}

QCoreApplication *ServerApplication::app() const {
    return m_app;
}