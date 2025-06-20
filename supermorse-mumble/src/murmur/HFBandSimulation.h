// Copyright The Mumble Developers. All rights reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file at the root of the
// Mumble source tree or at <https://www.mumble.info/LICENSE>.

#ifndef MUMBLE_MURMUR_HFBANDSIMULATION_H_
#define MUMBLE_MURMUR_HFBANDSIMULATION_H_

#include <QtCore/QHash>
#include <QtCore/QString>
#include <QtCore/QMap>
#include <QtCore/QTimer>

class ServerUser;
class Channel;

/**
 * @brief The HFBandSimulation class implements HF band propagation simulation for amateur radio.
 * 
 * This class provides functionality for simulating HF band propagation between users based on
 * their Maidenhead grid locators. It calculates signal strength, recommends appropriate bands,
 * and determines if communication is possible between users.
 */
class HFBandSimulation {
public:
    /**
     * @brief Constructor for HFBandSimulation.
     */
    HFBandSimulation();

    /**
     * @brief Destructor for HFBandSimulation.
     */
    ~HFBandSimulation();

    /**
     * @brief Initialize the HF band simulation.
     * 
     * Sets up the band definitions, propagation parameters, and starts the update timer.
     */
    void initialize();

    /**
     * @brief Update the propagation conditions for all users.
     * 
     * This method is called periodically to update the propagation conditions
     * between all users based on their grid locators and current band conditions.
     */
    void updatePropagation();

    /**
     * @brief Calculate the propagation between two users.
     * 
     * @param user1 The first user
     * @param user2 The second user
     * @return The signal strength between the users (0.0 to 1.0)
     */
    float calculatePropagation(ServerUser *user1, ServerUser *user2);

    /**
     * @brief Determine if two users can communicate.
     * 
     * @param user1 The first user
     * @param user2 The second user
     * @return True if communication is possible, false otherwise
     */
    bool canCommunicate(ServerUser *user1, ServerUser *user2);

    /**
     * @brief Calculate the signal strength between two grid locators.
     * 
     * @param grid1 The first Maidenhead grid locator
     * @param grid2 The second Maidenhead grid locator
     * @return The signal strength (0.0 to 1.0)
     */
    float calculateSignalStrength(const QString &grid1, const QString &grid2);

    /**
     * @brief Calculate the distance between two grid locators.
     * 
     * @param grid1 The first Maidenhead grid locator
     * @param grid2 The second Maidenhead grid locator
     * @return The distance in kilometers
     */
    float calculateDistance(const QString &grid1, const QString &grid2);

    /**
     * @brief Convert a Maidenhead grid locator to latitude and longitude.
     * 
     * @param grid The Maidenhead grid locator
     * @return A pair containing latitude and longitude
     */
    QPair<float, float> gridToLatLon(const QString &grid);

    /**
     * @brief Recommend the best band for a given distance.
     * 
     * @param distance The distance in kilometers
     * @return The recommended band (160, 80, 60, 40, 30, 20, 17, 15, 10, or 6)
     */
    int recommendBand(float distance);

    /**
     * @brief Get the channel ID for a specific band.
     * 
     * @param band The band (160, 80, 60, 40, 30, 20, 17, 15, 10, or 6)
     * @return The channel ID
     */
    int getBandChannel(int band);

    /**
     * @brief Get the band for a specific channel.
     * 
     * @param channelId The channel ID
     * @return The band (160, 80, 60, 40, 30, 20, 17, 15, 10, or 6), or 0 if not a band channel
     */
    int getChannelBand(int channelId);

private:
    // Map of band to channel ID
    QMap<int, int> m_bandChannels;
    
    // Map of channel ID to band
    QMap<int, int> m_channelBands;
    
    // Map of user session to grid locator
    QHash<unsigned int, QString> m_userGrids;
    
    // Map of user pairs to signal strength
    QHash<QPair<unsigned int, unsigned int>, float> m_signalStrengths;
    
    // Timer for periodic propagation updates
    QTimer m_updateTimer;
    
    // Band definitions with min/max distances
    struct BandDefinition {
        int band;           // Band in meters (160, 80, etc.)
        float minDistance;  // Minimum effective distance in km
        float maxDistance;  // Maximum effective distance in km
        float reliability;  // Base reliability factor (0.0 to 1.0)
    };
    
    // List of band definitions
    QList<BandDefinition> m_bandDefinitions;
    
    // Initialize band definitions
    void initializeBandDefinitions();
};

#endif // MUMBLE_MURMUR_HFBANDSIMULATION_H_