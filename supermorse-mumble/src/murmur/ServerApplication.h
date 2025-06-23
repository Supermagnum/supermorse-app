// Copyright The Mumble Developers. All rights reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file at the root of the
// Mumble source tree or at <https://www.mumble.info/LICENSE>.

#ifndef MUMBLE_MURMUR_SERVERAPPLICATION_H_
#define MUMBLE_MURMUR_SERVERAPPLICATION_H_

#include <QtCore/QObject>
#include <QtCore/QString>

class QCoreApplication;

/// ServerApplication is a helper class for managing the server application.
class ServerApplication : public QObject {
    Q_OBJECT
public:
    /// Creates a new ServerApplication instance.
    ServerApplication(QCoreApplication *app);
    
    /// Destroys the ServerApplication instance.
    ~ServerApplication();
    
    /// Starts the server application.
    bool start();
    
    /// Stops the server application.
    void stop();
    
    /// Returns the application instance.
    QCoreApplication *app() const;
    
private:
    QCoreApplication *m_app;
};

#endif // MUMBLE_MURMUR_SERVERAPPLICATION_H_