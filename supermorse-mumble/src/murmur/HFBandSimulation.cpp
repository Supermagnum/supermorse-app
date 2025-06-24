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

// Constants for solar calculations
const float SOLAR_DECLINATION_MAX = 23.44f; // Maximum solar declination in degrees

HFBandSimulation::HFBandSimulation(QObject *parent) : QObject(parent) {
    // Initialize default values
    m_solarFluxIndex = 120; // Moderate solar activity
    m_kIndex = 3;           // Moderate geomagnetic activity
    m_season = 0;           // Winter
    m_autoTimeEnabled = true;
    
    // Initialize external data settings
    m_useExternalData = false;
    m_useDXViewData = false;
    m_useSWPCData = false;
    m_lastExternalUpdate = QDateTime::currentDateTime().addSecs(-3600); // 1 hour ago
    
    // Initialize network manager for HTTP requests
    m_networkManager = new QNetworkAccessManager(this);
    
    // Connect the timer signal to the updatePropagation slot
    connect(&m_updateTimer, &QTimer::timeout, this, &HFBandSimulation::updatePropagation);
}

HFBandSimulation::~HFBandSimulation() {
    // Stop the timer when the object is destroyed
    m_updateTimer.stop();
    
    // Clean up network manager
    if (m_networkManager) {
        delete m_networkManager;
        m_networkManager = nullptr;
    }
}

void HFBandSimulation::initialize() {
    QMutexLocker locker(&m_mutex);
    
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
    m_bandDefinitions.append({160, 1.9f, 0, 1000, 0.8f, 0.5f, 1.5f});
    
    // 80 meters (3.5-4.0 MHz) - Good for regional communication, better at night
    m_bandDefinitions.append({80, 3.75f, 0, 1500, 0.85f, 0.6f, 1.4f});
    
    // 60 meters (5.3-5.4 MHz) - Similar to 80m but with less interference
    m_bandDefinitions.append({60, 5.35f, 200, 2000, 0.8f, 0.7f, 1.3f});
    
    // 40 meters (7.0-7.3 MHz) - Good day and night, medium distance
    m_bandDefinitions.append({40, 7.15f, 500, 3000, 0.9f, 0.8f, 1.2f});
    
    // 30 meters (10.1-10.15 MHz) - Good day and night, medium-long distance
    m_bandDefinitions.append({30, 10.125f, 800, 4000, 0.85f, 0.9f, 1.1f});
    
    // 20 meters (14.0-14.35 MHz) - Excellent daytime band for long distance
    m_bandDefinitions.append({20, 14.175f, 1000, 10000, 0.95f, 1.3f, 0.7f});
    
    // 17 meters (18.068-18.168 MHz) - Similar to 20m but less crowded
    m_bandDefinitions.append({17, 18.118f, 1500, 12000, 0.9f, 1.4f, 0.6f});
    
    // 15 meters (21.0-21.45 MHz) - Good for long distance during daylight
    m_bandDefinitions.append({15, 21.225f, 2000, 15000, 0.85f, 1.5f, 0.5f});
    
    // 10 meters (28.0-29.7 MHz) - Excellent for very long distance when open
    m_bandDefinitions.append({10, 28.85f, 3000, 20000, 0.8f, 1.6f, 0.4f});
    
    // 6 meters (50-54 MHz) - "Magic band", unpredictable but can be excellent
    m_bandDefinitions.append({6, 52.0f, 5000, 25000, 0.7f, 1.7f, 0.3f});
}

void HFBandSimulation::updatePropagation() {
    QMutexLocker locker(&m_mutex);
    
    // Clear the signal strength cache
    m_signalStrengths.clear();
    
    // Get current date/time for propagation calculations
    QDateTime now = QDateTime::currentDateTime();
    
    // Update season based on current date if auto-season is enabled
    if (m_autoTimeEnabled) {
        int month = now.date().month();
        if (month >= 3 && month <= 5) {
            m_season = 1; // Spring
        } else if (month >= 6 && month <= 8) {
            m_season = 2; // Summer
        } else if (month >= 9 && month <= 11) {
            m_season = 3; // Fall
        } else {
            m_season = 0; // Winter
        }
    }
    
    // Check if we should fetch external data
    if (m_useExternalData) {
        // Check if it's time to update (every 30 minutes)
        if (m_lastExternalUpdate.secsTo(now) >= 30 * 60) {
            qDebug() << "Time to update external data (30 minute interval)";
            
            // Fetch data from external sources
            if (m_useDXViewData) {
                fetchDXViewData();
            }
            
            if (m_useSWPCData) {
                fetchSWPCData();
            }
            
            // Update the last update time
            m_lastExternalUpdate = now;
        }
    } else {
        // Use the internal simulation model
        // Add some random variation to simulate changing solar conditions
        if (QRandomGenerator::global()->generateDouble() < 0.1) {
            // 10% chance of a significant change in solar conditions
            int sfiChange = QRandomGenerator::global()->bounded(-20, 21);
            m_solarFluxIndex = qBound(60, m_solarFluxIndex + sfiChange, 300);
            
            int kChange = QRandomGenerator::global()->bounded(-2, 3);
            m_kIndex = qBound(0, m_kIndex + kChange, 9);
            
            qDebug() << "Solar conditions updated: SFI =" << m_solarFluxIndex << ", K-index =" << m_kIndex;
        }
    }
    
    // Emit signal to notify that propagation has been updated
    emit propagationUpdated();
}

float HFBandSimulation::calculatePropagation(ServerUser *user1, ServerUser *user2) {
    QMutexLocker locker(&m_mutex);
    
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
    QMutexLocker locker(&m_mutex);
    
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
    
    // Get the frequencies for each band
    float freq1 = bandToFrequency(band1);
    float freq2 = bandToFrequency(band2);
    
    // Calculate the frequency ratio
    float freqRatio = qMax(freq1, freq2) / qMin(freq1, freq2);
    
    // If the frequency ratio is less than 2, communication might be possible
    // with good propagation (harmonics, etc.)
    if (freqRatio < 2.0f) {
        float propagation = calculatePropagation(user1, user2);
        // Higher threshold for cross-band communication (70% signal strength)
        return propagation >= 0.7f;
    }
    
    // Otherwise, no communication
    return false;
}

float HFBandSimulation::calculateSignalStrength(const QString &grid1, const QString &grid2) {
    QMutexLocker locker(&m_mutex);
    
    // Convert grid locators to lat/lon
    QPair<float, float> latLon1 = gridToLatLon(grid1);
    QPair<float, float> latLon2 = gridToLatLon(grid2);
    
    // Calculate distance
    float distance = calculateDistance(grid1, grid2);
    
    // Get current date/time for propagation calculations
    QDateTime now = QDateTime::currentDateTime();
    
    // Calculate day/night path percentage
    float dayFraction = calculateDayNightPath(
        latLon1.first, latLon1.second,
        latLon2.first, latLon2.second,
        now
    );
    
    // Calculate MUF and LUF
    float muf = calculateMUF(distance, dayFraction, m_season, m_solarFluxIndex);
    float luf = calculateLUF(distance, dayFraction, m_kIndex);
    
    // Find the best band for this distance
    int bestBand = recommendBand(distance);
    float bestFreq = bandToFrequency(bestBand);
    
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
    
    // Apply MUF/LUF effects
    if (bestFreq > muf) {
        // Frequency is above MUF, signal degrades rapidly
        float mufFactor = qExp(-(bestFreq - muf) / 5.0f);
        signalStrength *= mufFactor;
    } else if (bestFreq < luf) {
        // Frequency is below LUF, signal degrades rapidly
        float lufFactor = qExp(-(luf - bestFreq) / 2.0f);
        signalStrength *= lufFactor;
    }
    
    // Apply day/night adjustments based on band characteristics
    float dayNightFactor = (dayFraction * bestBandDef.dayFactor) + 
                          ((1.0f - dayFraction) * bestBandDef.nightFactor);
    signalStrength *= dayNightFactor;
    
    // Apply solar flux effects
    // Higher SFI improves propagation on higher bands
    if (bestBand <= 40) {
        // Lower bands - less affected by solar flux
        signalStrength *= (0.8f + (0.2f * m_solarFluxIndex / 200.0f));
    } else {
        // Higher bands - more affected by solar flux
        signalStrength *= (0.5f + (0.5f * m_solarFluxIndex / 200.0f));
    }
    
    // Apply K-index effects
    // Higher K-index degrades propagation
    signalStrength *= (1.0f - (m_kIndex / 20.0f));
    
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

float HFBandSimulation::calculateDayNightPath(float lat1, float lon1, float lat2, float lon2, const QDateTime &dateTime) {
    // Calculate the solar zenith angle at multiple points along the path
    // to determine what percentage of the path is in daylight
    
    const int numPoints = 10; // Number of points to check along the path
    int dayPoints = 0;
    
    for (int i = 0; i <= numPoints; i++) {
        float fraction = static_cast<float>(i) / numPoints;
        
        // Interpolate between the two points
        float lat = lat1 + fraction * (lat2 - lat1);
        float lon = lon1 + fraction * (lon2 - lon1);
        
        // Calculate solar zenith angle at this point
        float zenith = calculateSolarZenithAngle(lat, lon, dateTime);
        
        // If zenith angle is less than 90 degrees, the point is in daylight
        if (zenith < 90.0f) {
            dayPoints++;
        }
    }
    
    // Return the fraction of points that are in daylight
    return static_cast<float>(dayPoints) / (numPoints + 1);
}

float HFBandSimulation::calculateSolarZenithAngle(float lat, float lon, const QDateTime &dateTime) {
    // Calculate the solar zenith angle at a given location and time
    // This is a simplified model that ignores atmospheric refraction
    
    // Convert latitude to radians
    float latRad = lat * DEG_TO_RAD;
    
    // Calculate day of year (0-365)
    int dayOfYear = dateTime.date().dayOfYear() - 1;
    
    // Calculate solar declination
    float declination = SOLAR_DECLINATION_MAX * sin(2.0f * M_PI * (dayOfYear - 172) / 365.0f) * DEG_TO_RAD;
    
    // Calculate hour angle
    float hourAngle = (dateTime.time().hour() + dateTime.time().minute() / 60.0f - 12.0f) * 15.0f * DEG_TO_RAD;
    // Adjust for longitude
    hourAngle += lon * DEG_TO_RAD;
    
    // Calculate solar zenith angle
    float cosZenith = sin(latRad) * sin(declination) + 
                     cos(latRad) * cos(declination) * cos(hourAngle);
    
    // Convert to degrees
    float zenith = acos(qBound(-1.0f, cosZenith, 1.0f)) * RAD_TO_DEG;
    
    return zenith;
}

float HFBandSimulation::calculateMUF(float distance, float dayFraction, int season, int sfi) {
    // Calculate the Maximum Usable Frequency (MUF) for a given path
    // This is a simplified model based on empirical observations
    
    // Base MUF depends on distance
    float baseMUF = 0.0f;
    
    if (distance < 500) {
        // Short distance: lower MUF
        baseMUF = 7.0f;
    } else if (distance < 1500) {
        // Medium distance
        baseMUF = 14.0f;
    } else if (distance < 3000) {
        // Medium-long distance
        baseMUF = 21.0f;
    } else {
        // Long distance
        baseMUF = 28.0f;
    }
    
    // Apply day/night factor
    // MUF is generally higher during the day
    float dayNightFactor = 0.7f + (0.6f * dayFraction);
    
    // Apply seasonal factor
    float seasonFactor = 1.0f;
    switch (season) {
        case 0: // Winter
            seasonFactor = 0.8f;
            break;
        case 1: // Spring
            seasonFactor = 1.1f;
            break;
        case 2: // Summer
            seasonFactor = 1.2f;
            break;
        case 3: // Fall
            seasonFactor = 1.0f;
            break;
    }
    
    // Apply solar flux factor
    // Higher SFI means higher MUF
    float sfiFactor = 0.5f + (sfi / 200.0f);
    
    // Calculate final MUF
    float muf = baseMUF * dayNightFactor * seasonFactor * sfiFactor;
    
    return muf;
}

float HFBandSimulation::calculateLUF(float distance, float dayFraction, int kIndex) {
    // Calculate the Lowest Usable Frequency (LUF) for a given path
    // This is a simplified model based on empirical observations
    
    // Base LUF depends on distance
    float baseLUF = 0.0f;
    
    if (distance < 500) {
        // Short distance: lower LUF
        baseLUF = 1.8f;
    } else if (distance < 1500) {
        // Medium distance
        baseLUF = 3.5f;
    } else if (distance < 3000) {
        // Medium-long distance
        baseLUF = 7.0f;
    } else {
        // Long distance
        baseLUF = 10.0f;
    }
    
    // Apply day/night factor
    // LUF is generally higher during the day due to D-layer absorption
    float dayNightFactor = 0.5f + (0.8f * dayFraction);
    
    // Apply K-index factor
    // Higher K-index means higher LUF due to increased absorption
    float kFactor = 1.0f + (kIndex / 10.0f);
    
    // Calculate final LUF
    float luf = baseLUF * dayNightFactor * kFactor;
    
    return luf;
}

float HFBandSimulation::bandToFrequency(int band) const {
    // Find the band definition
    for (const BandDefinition &def : m_bandDefinitions) {
        if (def.band == band) {
            return def.frequency;
        }
    }
    
    // Default frequencies if band not found
    switch (band) {
        case 160: return 1.9f;
        case 80: return 3.75f;
        case 60: return 5.35f;
        case 40: return 7.15f;
        case 30: return 10.125f;
        case 20: return 14.175f;
        case 17: return 18.118f;
        case 15: return 21.225f;
        case 10: return 28.85f;
        case 6: return 52.0f;
        default: return 0.0f;
    }
}

int HFBandSimulation::frequencyToBand(float frequency) const {
    // Find the closest amateur radio band
    if (frequency < 2.0f) return 160;
    if (frequency < 5.0f) return 80;
    if (frequency < 6.0f) return 60;
    if (frequency < 9.0f) return 40;
    if (frequency < 12.0f) return 30;
    if (frequency < 16.0f) return 20;
    if (frequency < 20.0f) return 17;
    if (frequency < 25.0f) return 15;
    if (frequency < 40.0f) return 10;
    if (frequency < 60.0f) return 6;
    return 0; // Unknown band
}

int HFBandSimulation::recommendBand(float distance) {
    QMutexLocker locker(&m_mutex);
    
    // Get current date/time for propagation calculations
    QDateTime now = QDateTime::currentDateTime();
    
    // Determine if it's day or night (simplified)
    int hour = now.time().hour();
    bool isDaytime = (hour >= 6 && hour < 18);
    
    // Recommend band based on distance and time of day
    if (distance < 500) {
        // Short distance
        return isDaytime ? 40 : 80;
    } else if (distance < 1500) {
        // Medium distance
        return isDaytime ? 20 : 40;
    } else if (distance < 3000) {
        // Medium-long distance
        if (isDaytime) {
            // During the day, higher bands work better for longer distances
            return (m_solarFluxIndex > 100) ? 15 : 20;
        } else {
            // At night, lower bands work better
            return 20;
        }
    } else {
        // Long distance
        if (isDaytime && m_solarFluxIndex > 120) {
            // Good solar conditions during the day
            return 10;
        } else if (isDaytime) {
            // Moderate solar conditions during the day
            return 15;
        } else {
            // Night time
            return 20;
        }
    }
}

int HFBandSimulation::getBandChannel(int band) {
    QMutexLocker locker(&m_mutex);
    
    // Get the channel ID for a specific band
    return m_bandChannels.value(band, 0);
}

int HFBandSimulation::getChannelBand(int channelId) {
    QMutexLocker locker(&m_mutex);
    
    // Get the band for a specific channel
    return m_channelBands.value(channelId, 0);
}

void HFBandSimulation::setSolarFluxIndex(int sfi) {
    QMutexLocker locker(&m_mutex);
    
    // Set the solar flux index, clamping to valid range
    m_solarFluxIndex = qBound(60, sfi, 300);
    
    // Update propagation with new value
    updatePropagation();
}

int HFBandSimulation::solarFluxIndex() const {
    QMutexLocker locker(&m_mutex);
    
    return m_solarFluxIndex;
}

void HFBandSimulation::setKIndex(int kIndex) {
    QMutexLocker locker(&m_mutex);
    
    // Set the K-index, clamping to valid range
    m_kIndex = qBound(0, kIndex, 9);
    
    // Update propagation with new value
    updatePropagation();
}

int HFBandSimulation::kIndex() const {
    QMutexLocker locker(&m_mutex);
    
    return m_kIndex;
}

void HFBandSimulation::setSeason(int season) {
    QMutexLocker locker(&m_mutex);
    
    // Set the season, clamping to valid range
    m_season = qBound(0, season, 3);
    
    // Update propagation with new value
    updatePropagation();
}

int HFBandSimulation::season() const {
    QMutexLocker locker(&m_mutex);
    
    return m_season;
}

void HFBandSimulation::setAutoTimeEnabled(bool enabled) {
    QMutexLocker locker(&m_mutex);
    
    m_autoTimeEnabled = enabled;
    
    // Update propagation with new setting
    updatePropagation();
}

bool HFBandSimulation::isAutoTimeEnabled() const {
    QMutexLocker locker(&m_mutex);
    
    return m_autoTimeEnabled;
}

void HFBandSimulation::setUseExternalData(bool use) {
    QMutexLocker locker(&m_mutex);
    
    m_useExternalData = use;
    
    // Update propagation with new setting
    updatePropagation();
}

bool HFBandSimulation::useExternalData() const {
    QMutexLocker locker(&m_mutex);
    
    return m_useExternalData;
}

void HFBandSimulation::setUseDXViewData(bool use) {
    QMutexLocker locker(&m_mutex);
    
    m_useDXViewData = use;
    
    // Update propagation with new setting
    if (m_useExternalData && m_useDXViewData) {
        fetchDXViewData();
    }
}

bool HFBandSimulation::useDXViewData() const {
    QMutexLocker locker(&m_mutex);
    
    return m_useDXViewData;
}

void HFBandSimulation::setUseSWPCData(bool use) {
    QMutexLocker locker(&m_mutex);
    
    m_useSWPCData = use;
    
    // Update propagation with new setting
    if (m_useExternalData && m_useSWPCData) {
        fetchSWPCData();
    }
}

bool HFBandSimulation::useSWPCData() const {
    QMutexLocker locker(&m_mutex);
    
    return m_useSWPCData;
}

void HFBandSimulation::fetchDXViewData() {
    QMutexLocker locker(&m_mutex);
    
    if (!m_networkManager) {
        qWarning() << "Network manager not initialized for DXView data fetching";
        return;
    }
    
    // Construct the URL for DXView.org HF propagation data
    QUrl url("https://hf.dxview.org/api/propagation");
    
    // Create and send the request
    QNetworkRequest request(url);
    request.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
    
    // Connect the response handler
    QNetworkReply *reply = m_networkManager->get(request);
    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        processDXViewResponse(reply);
    });
    
    qDebug() << "Fetching DXView.org propagation data from" << url.toString();
}

void HFBandSimulation::fetchSWPCData() {
    QMutexLocker locker(&m_mutex);
    
    if (!m_networkManager) {
        qWarning() << "Network manager not initialized for SWPC data fetching";
        return;
    }
    
    // Construct the URL for SWPC (Space Weather Prediction Center) data
    QUrl url("https://services.swpc.noaa.gov/products/summary/solar-indices.json");
    
    // Create and send the request
    QNetworkRequest request(url);
    request.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
    
    // Connect the response handler
    QNetworkReply *reply = m_networkManager->get(request);
    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        processSWPCResponse(reply);
    });
    
    qDebug() << "Fetching SWPC solar weather data from" << url.toString();
}

void HFBandSimulation::processDXViewResponse(QNetworkReply *reply) {
    if (!reply) {
        qWarning() << "Null reply in processDXViewResponse";
        emit externalDataUpdated("DXView", false);
        return;
    }
    
    // Handle errors
    if (reply->error() != QNetworkReply::NoError) {
        qWarning() << "Error fetching DXView data:" << reply->errorString();
        emit externalDataUpdated("DXView", false);
        reply->deleteLater();
        return;
    }
    
    // Read the response data
    QByteArray data = reply->readAll();
    reply->deleteLater();
    
    // Parse the JSON response
    QJsonDocument doc = QJsonDocument::fromJson(data);
    if (doc.isNull() || !doc.isObject()) {
        qWarning() << "Invalid JSON response from DXView";
        emit externalDataUpdated("DXView", false);
        return;
    }
    
    QJsonObject obj = doc.object();
    
    // Extract propagation data
    QMutexLocker locker(&m_mutex);
    
    bool updated = false;
    
    // Check for SFI (Solar Flux Index)
    if (obj.contains("sfi") && obj["sfi"].isDouble()) {
        int sfi = qRound(obj["sfi"].toDouble());
        m_solarFluxIndex = qBound(60, sfi, 300);
        updated = true;
    }
    
    // Check for K-index
    if (obj.contains("kindex") && obj["kindex"].isDouble()) {
        int kIndex = qRound(obj["kindex"].toDouble());
        m_kIndex = qBound(0, kIndex, 9);
        updated = true;
    }
    
    // Extract band-specific data if available
    if (obj.contains("bands") && obj["bands"].isObject()) {
        QJsonObject bands = obj["bands"].toObject();
        
        // Process each band
        QStringList bandKeys = bands.keys();
        for (const QString &key : bandKeys) {
            // Convert band name to meters (e.g., "10m" -> 10)
            QString bandStr = key;
            bandStr.remove(QRegularExpression("[^0-9]"));
            bool ok;
            int band = bandStr.toInt(&ok);
            
            if (ok && bands[key].isObject()) {
                QJsonObject bandData = bands[key].toObject();
                
                // Extract propagation quality for this band
                if (bandData.contains("quality") && bandData["quality"].isDouble()) {
                    double quality = bandData["quality"].toDouble();
                    
                    // Update band-specific propagation in our model
                    // This would update the relevant band definition
                    for (int i = 0; i < m_bandDefinitions.size(); ++i) {
                        if (m_bandDefinitions[i].band == band) {
                            // Scale quality to our reliability factor (0.0-1.0)
                            m_bandDefinitions[i].reliability = quality / 10.0f;
                            updated = true;
                            break;
                        }
                    }
                }
            }
        }
    }
    
    // Emit the result
    emit externalDataUpdated("DXView", updated);
    
    if (updated) {
        qDebug() << "Updated propagation data from DXView.org: SFI =" << m_solarFluxIndex << ", K-index =" << m_kIndex;
        
        // Update propagation with the new data
        updatePropagation();
    }
}

void HFBandSimulation::processSWPCResponse(QNetworkReply *reply) {
    if (!reply) {
        qWarning() << "Null reply in processSWPCResponse";
        emit externalDataUpdated("SWPC", false);
        return;
    }
    
    // Handle errors
    if (reply->error() != QNetworkReply::NoError) {
        qWarning() << "Error fetching SWPC data:" << reply->errorString();
        emit externalDataUpdated("SWPC", false);
        reply->deleteLater();
        return;
    }
    
    // Read the response data
    QByteArray data = reply->readAll();
    reply->deleteLater();
    
    // Parse the JSON response
    QJsonDocument doc = QJsonDocument::fromJson(data);
    if (doc.isNull() || !doc.isObject()) {
        qWarning() << "Invalid JSON response from SWPC";
        emit externalDataUpdated("SWPC", false);
        return;
    }
    
    QJsonObject obj = doc.object();
    
    // Extract solar weather data
    QMutexLocker locker(&m_mutex);
    
    bool updated = false;
    
    // Check for SFI (Solar Flux Index)
    if (obj.contains("sfi") && obj["sfi"].isDouble()) {
        int sfi = qRound(obj["sfi"].toDouble());
        m_solarFluxIndex = qBound(60, sfi, 300);
        updated = true;
    }
    
    // Check for K-index
    if (obj.contains("k_index") && obj["k_index"].isDouble()) {
        int kIndex = qRound(obj["k_index"].toDouble());
        m_kIndex = qBound(0, kIndex, 9);
        updated = true;
    }
    
    // Emit the result
    emit externalDataUpdated("SWPC", updated);
    
    if (updated) {
        qDebug() << "Updated solar weather data from SWPC: SFI =" << m_solarFluxIndex << ", K-index =" << m_kIndex;
        
        // Update propagation with the new data
        updatePropagation();
    }
}