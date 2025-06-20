// Copyright The Mumble Developers. All rights reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file at the root of the
// Mumble source tree or at <https://www.mumble.info/LICENSE>.

#include "HFBandSimulation.h"
#include "ServerUser.h"
#include "Channel.h"

#include <QtCore/QDateTime>
#include <QtCore/QDebug>
#include <QtCore/QMutexLocker>
#include <QtCore/QRandomGenerator>
#include <QtCore/QtMath>

#include <cmath>

// Constants for Maidenhead grid calculations
const float DEG_TO_RAD = M_PI / 180.0f;
const float RAD_TO_DEG = 180.0f / M_PI;
const float EARTH_RADIUS_KM = 6371.0f;

HFBandSimulation::HFBandSimulation() {
    // Connect the timer signal to the updatePropagation slot
    connect(&m_updateTimer, &QTimer::timeout, this, &HFBandSimulation::updatePropagation);
}

HFBandSimulation::~HFBandSimulation() {
    // Stop the timer when the object is destroyed
    m_updateTimer.stop();
}

void HFBandSimulation::initialize() {
    // Initialize band definitions
    initializeBandDefinitions();
    
    // Set up band to channel mappings
    m_bandChannels.insert(160, 1);
    m_bandChannels.insert(80, 2);
    m_bandChannels.insert(60, 3);
    m_bandChannels.insert(40, 4);
    m_bandChannels.insert(30, 5);
    m_bandChannels.insert(20, 6);
    m_bandChannels.insert(17, 7);
    m_bandChannels.insert(15, 8);
    m_bandChannels.insert(10, 9);
    m_bandChannels.insert(6, 10);
    
    // Set up channel to band mappings
    m_channelBands.insert(1, 160);
    m_channelBands.insert(2, 80);
    m_channelBands.insert(3, 60);
    m_channelBands.insert(4, 40);
    m_channelBands.insert(5, 30);
    m_channelBands.insert(6, 20);
    m_channelBands.insert(7, 17);
    m_channelBands.insert(8, 15);
    m_channelBands.insert(9, 10);
    m_channelBands.insert(10, 6);
    
    // Start the propagation update timer (update every 5 minutes)
    m_updateTimer.start(5 * 60 * 1000);
    
    // Do an initial update
    updatePropagation();
}

void HFBandSimulation::initializeBandDefinitions() {
    // Define the propagation characteristics for each band
    // These values are approximate and simplified for simulation purposes
    
    // 160 meters (1.8-2.0 MHz) - Good for local/regional communication at night
    m_bandDefinitions.append({160, 0, 1000, 0.8});
    
    // 80 meters (3.5-4.0 MHz) - Good for regional communication, better at night
    m_bandDefinitions.append({80, 0, 1500, 0.85});
    
    // 60 meters (5.3-5.4 MHz) - Similar to 80m but with less interference
    m_bandDefinitions.append({60, 200, 2000, 0.8});
    
    // 40 meters (7.0-7.3 MHz) - Good day and night, medium distance
    m_bandDefinitions.append({40, 500, 3000, 0.9});
    
    // 30 meters (10.1-10.15 MHz) - Good day and night, medium-long distance
    m_bandDefinitions.append({30, 800, 4000, 0.85});
    
    // 20 meters (14.0-14.35 MHz) - Excellent daytime band for long distance
    m_bandDefinitions.append({20, 1000, 10000, 0.95});
    
    // 17 meters (18.068-18.168 MHz) - Similar to 20m but less crowded
    m_bandDefinitions.append({17, 1500, 12000, 0.9});
    
    // 15 meters (21.0-21.45 MHz) - Good for long distance during daylight
    m_bandDefinitions.append({15, 2000, 15000, 0.85});
    
    // 10 meters (28.0-29.7 MHz) - Excellent for very long distance when open
    m_bandDefinitions.append({10, 3000, 20000, 0.8});
    
    // 6 meters (50-54 MHz) - "Magic band", unpredictable but can be excellent
    m_bandDefinitions.append({6, 5000, 25000, 0.7});
}

void HFBandSimulation::updatePropagation() {
    // This method would be called periodically to update propagation conditions
    // In a real implementation, this would consider:
    // - Time of day (day/night path)
    // - Solar conditions (sunspot cycle, solar flux, etc.)
    // - Seasonal variations
    // - Current band conditions
    
    // For this simplified implementation, we'll just randomize the conditions a bit
    // to simulate changing propagation
    
    // Clear the signal strength cache
    m_signalStrengths.clear();
    
    // In a real implementation, we would update the propagation model here
    // based on current conditions
}

float HFBandSimulation::calculatePropagation(ServerUser *user1, ServerUser *user2) {
    if (!user1 || !user2) {
        return 0.0f;
    }
    
    // Get the users' grid locators from their metadata
    QString grid1 = user1->qsMetadata.value("maidenheadgrid", "").toString();
    QString grid2 = user2->qsMetadata.value("maidenheadgrid", "").toString();
    
    // If either user doesn't have a grid locator, assume no propagation
    if (grid1.isEmpty() || grid2.isEmpty()) {
        return 0.0f;
    }
    
    // Check if we've already calculated this pair
    QPair<unsigned int, unsigned int> userPair(user1->uiSession, user2->uiSession);
    if (m_signalStrengths.contains(userPair)) {
        return m_signalStrengths.value(userPair);
    }
    
    // Calculate the signal strength
    float signalStrength = calculateSignalStrength(grid1, grid2);
    
    // Cache the result
    m_signalStrengths.insert(userPair, signalStrength);
    
    return signalStrength;
}

bool HFBandSimulation::canCommunicate(ServerUser *user1, ServerUser *user2) {
    if (!user1 || !user2) {
        return false;
    }
    
    // If users are in the same channel, they can always communicate
    if (user1->cChannel == user2->cChannel) {
        return true;
    }
    
    // Get the band for each user's channel
    int band1 = getChannelBand(user1->cChannel->iId);
    int band2 = getChannelBand(user2->cChannel->iId);
    
    // If either user is not in a band channel, they can't communicate via HF
    if (band1 == 0 || band2 == 0) {
        return false;
    }
    
    // If users are on the same band, check propagation
    if (band1 == band2) {
        float propagation = calculatePropagation(user1, user2);
        // Threshold for communication (50% signal strength)
        return propagation >= 0.5f;
    }
    
    // If users are on different bands, check if the bands are linked
    // and if propagation allows communication
    
    // In this simplified model, we'll say adjacent bands can communicate
    // if propagation is good enough
    if (abs(band1 - band2) == 1) {
        float propagation = calculatePropagation(user1, user2);
        // Higher threshold for cross-band communication (70% signal strength)
        return propagation >= 0.7f;
    }
    
    // Otherwise, no communication
    return false;
}

float HFBandSimulation::calculateSignalStrength(const QString &grid1, const QString &grid2) {
    // Calculate the distance between the two grid locators
    float distance = calculateDistance(grid1, grid2);
    
    // Get the current time to determine day/night conditions
    QDateTime now = QDateTime::currentDateTime();
    int hour = now.time().hour();
    bool isDaytime = (hour >= 6 && hour < 18);
    
    // Find the best band for this distance
    int bestBand = recommendBand(distance);
    
    // Find the band definition
    BandDefinition bestBandDef;
    for (const BandDefinition &def : m_bandDefinitions) {
        if (def.band == bestBand) {
            bestBandDef = def;
            break;
        }
    }
    
    // Calculate base signal strength based on distance and band characteristics
    float signalStrength = 0.0f;
    
    if (distance < bestBandDef.minDistance) {
        // Too close for this band (skip zone)
        signalStrength = 0.3f;
    } else if (distance > bestBandDef.maxDistance) {
        // Too far for this band
        signalStrength = 0.1f;
    } else {
        // Within the effective range
        // Signal strength decreases with distance
        float distanceFactor = 1.0f - ((distance - bestBandDef.minDistance) / 
                                      (bestBandDef.maxDistance - bestBandDef.minDistance));
        signalStrength = bestBandDef.reliability * distanceFactor;
    }
    
    // Apply day/night adjustments
    // Lower bands (160m, 80m, 60m) work better at night
    // Higher bands (20m, 17m, 15m, 10m) work better during the day
    if (bestBand >= 160 && bestBand <= 60) {
        // Lower bands
        if (isDaytime) {
            signalStrength *= 0.7f; // Worse during the day
        } else {
            signalStrength *= 1.2f; // Better at night
        }
    } else if (bestBand <= 20) {
        // Middle bands - not much day/night difference
    } else {
        // Higher bands
        if (isDaytime) {
            signalStrength *= 1.2f; // Better during the day
        } else {
            signalStrength *= 0.6f; // Worse at night
        }
    }
    
    // Add some randomness to simulate changing conditions
    float randomFactor = 0.8f + (QRandomGenerator::global()->generateDouble() * 0.4f);
    signalStrength *= randomFactor;
    
    // Ensure signal strength is between 0 and 1
    return qBound(0.0f, signalStrength, 1.0f);
}

float HFBandSimulation::calculateDistance(const QString &grid1, const QString &grid2) {
    // Convert grid locators to lat/lon
    QPair<float, float> latLon1 = gridToLatLon(grid1);
    QPair<float, float> latLon2 = gridToLatLon(grid2);
    
    // Calculate great circle distance using the Haversine formula
    float lat1 = latLon1.first * DEG_TO_RAD;
    float lon1 = latLon1.second * DEG_TO_RAD;
    float lat2 = latLon2.first * DEG_TO_RAD;
    float lon2 = latLon2.second * DEG_TO_RAD;
    
    float dLat = lat2 - lat1;
    float dLon = lon2 - lon1;
    
    float a = sin(dLat/2) * sin(dLat/2) + 
              cos(lat1) * cos(lat2) * 
              sin(dLon/2) * sin(dLon/2);
    float c = 2 * atan2(sqrt(a), sqrt(1-a));
    
    return EARTH_RADIUS_KM * c;
}

QPair<float, float> HFBandSimulation::gridToLatLon(const QString &grid) {
    // Maidenhead grid locator to latitude/longitude conversion
    // Grid is typically 4 or 6 characters, e.g., "FN20" or "FN20vr"
    
    if (grid.length() < 4) {
        // Invalid grid, return default coordinates
        return QPair<float, float>(0.0f, 0.0f);
    }
    
    // Extract the grid components
    QChar field1 = grid[0].toUpper();
    QChar field2 = grid[1].toUpper();
    QChar square1 = grid[2];
    QChar square2 = grid[3];
    
    // Calculate longitude
    float lon = (field1.unicode() - 'A') * 20.0f - 180.0f;
    lon += (square1.unicode() - '0') * 2.0f;
    if (grid.length() >= 6) {
        QChar subsquare1 = grid[4].toLower();
        lon += (subsquare1.unicode() - 'a') * 2.0f / 24.0f;
    } else {
        // Add 1 degree for center of grid square
        lon += 1.0f;
    }
    
    // Calculate latitude
    float lat = (field2.unicode() - 'A') * 10.0f - 90.0f;
    lat += (square2.unicode() - '0') * 1.0f;
    if (grid.length() >= 6) {
        QChar subsquare2 = grid[5].toLower();
        lat += (subsquare2.unicode() - 'a') * 1.0f / 24.0f;
    } else {
        // Add 0.5 degrees for center of grid square
        lat += 0.5f;
    }
    
    return QPair<float, float>(lat, lon);
}

int HFBandSimulation::recommendBand(float distance) {
    // Recommend the best band for a given distance
    // This is a simplified model based on typical propagation
    
    if (distance < 500) {
        // Short distance: 160m or 80m
        return 80;
    } else if (distance < 1500) {
        // Medium distance: 40m
        return 40;
    } else if (distance < 3000) {
        // Medium-long distance: 20m
        return 20;
    } else {
        // Long distance: 15m
        return 15;
    }
}

int HFBandSimulation::getBandChannel(int band) {
    // Get the channel ID for a specific band
    return m_bandChannels.value(band, 0);
}

int HFBandSimulation::getChannelBand(int channelId) {
    // Get the band for a specific channel
    return m_channelBands.value(channelId, 0);
}