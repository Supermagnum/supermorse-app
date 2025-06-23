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
#include <QtCore/QDateTime>
#include <QtCore/QMutex>
#include <QtCore/QObject>
#include <QtNetwork/QNetworkAccessManager>
#include <QtNetwork/QNetworkRequest>
#include <QtNetwork/QNetworkReply>

class ServerUser;
class Channel;

/**
 * @brief The HFBandSimulation class implements HF band propagation simulation for amateur radio.
 * 
 * This class provides realistic simulation of HF band propagation based on:
 * - Maidenhead grid locators for geographic positioning
 * - Time of day effects on different frequency bands
 * - Seasonal variations in propagation
 * - Solar activity (from simulation or real-time data)
 * - Distance-based signal attenuation
 * 
 * It allows for simulating the propagation conditions between users on
 * different HF bands, determining if communication is possible, and
 * recommending appropriate bands for given distances.
 * 
 * It can also fetch real-time propagation data from external sources:
 * - hf.dxview.org for band-specific propagation data
 * - swpc.noaa.gov for solar weather data
 */
class HFBandSimulation : public QObject {
    Q_OBJECT
public:
    /**
     * @brief Constructor for HFBandSimulation.
     * @param parent The parent QObject
     */
    HFBandSimulation(QObject *parent = nullptr);

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
     * @brief Recommend the best band for a given distance.
     * 
     * @param distance The distance in kilometers
     * @return The recommended band (160, 80, 60, 40, 30, 20, 17, 15, 10, or 6)
     */
    int recommendBand(float distance);

    /**
     * @brief Get the channel ID for a specific band.
     * 
     * @param band The band in meters
     * @return The channel ID
     */
    int getBandChannel(int band);

    /**
     * @brief Get the band for a specific channel.
     * 
     * @param channelId The channel ID
     * @return The band in meters, or 0 if not a band channel
     */
    int getChannelBand(int channelId);

    /**
     * @brief Sets the solar flux index for propagation calculations.
     * 
     * The solar flux index (SFI) is a measure of solar activity that affects
     * ionospheric propagation. Higher values generally improve HF propagation.
     * 
     * @param sfi The solar flux index (typically 60-300)
     */
    void setSolarFluxIndex(int sfi);

    /**
     * @brief Gets the current solar flux index.
     * 
     * @return The current solar flux index
     */
    int solarFluxIndex() const;

    /**
     * @brief Sets the K-index for propagation calculations.
     * 
     * The K-index is a measure of geomagnetic activity that affects
     * ionospheric propagation. Higher values generally degrade HF propagation.
     * 
     * @param kIndex The K-index (0-9)
     */
    void setKIndex(int kIndex);

    /**
     * @brief Gets the current K-index.
     * 
     * @return The current K-index
     */
    int kIndex() const;

    /**
     * @brief Sets the season for propagation calculations.
     * 
     * @param season The season (0=Winter, 1=Spring, 2=Summer, 3=Fall)
     */
    void setSeason(int season);

    /**
     * @brief Gets the current season.
     * 
     * @return The current season
     */
    int season() const;

    /**
     * @brief Enables or disables automatic time-of-day effects.
     * 
     * When enabled, the simulation will use the current time to determine
     * day/night effects on propagation. When disabled, a fixed time can be set.
     * 
     * @param enabled Whether automatic time-of-day effects are enabled
     */
    void setAutoTimeEnabled(bool enabled);

    /**
     * @brief Checks if automatic time-of-day effects are enabled.
     * 
     * @return true if automatic time-of-day effects are enabled
     */
    bool isAutoTimeEnabled() const;

    /**
     * @brief Enables or disables the use of external data sources.
     * 
     * When enabled, the simulation will fetch real-time data from external sources
     * to update propagation conditions. When disabled, it will use the internal model.
     * 
     * @param use Whether to use external data sources
     */
    void setUseExternalData(bool use);

    /**
     * @brief Checks if external data sources are enabled.
     * 
     * @return true if external data sources are enabled
     */
    bool useExternalData() const;

    /**
     * @brief Enables or disables the use of DXView.org data.
     * 
     * When enabled, the simulation will fetch propagation data from hf.dxview.org.
     * This only has an effect if useExternalData() is also true.
     * 
     * @param use Whether to use DXView.org data
     */
    void setUseDXViewData(bool use);

    /**
     * @brief Checks if DXView.org data is enabled.
     * 
     * @return true if DXView.org data is enabled
     */
    bool useDXViewData() const;

    /**
     * @brief Enables or disables the use of SWPC data.
     * 
     * When enabled, the simulation will fetch solar weather data from swpc.noaa.gov.
     * This only has an effect if useExternalData() is also true.
     * 
     * @param use Whether to use SWPC data
     */
    void setUseSWPCData(bool use);

    /**
     * @brief Checks if SWPC data is enabled.
     * 
     * @return true if SWPC data is enabled
     */
    bool useSWPCData() const;

public slots:
    /**
     * @brief Update the propagation conditions for all users.
     * 
     * This method is called periodically to update the propagation conditions
     * between all users based on their grid locators and current band conditions.
     * It takes into account time of day, season, and solar activity.
     * 
     * If external data sources are enabled, it will fetch data from those sources
     * before updating the propagation conditions.
     */
    void updatePropagation();

    /**
     * @brief Fetch propagation data from DXView.org.
     * 
     * This method fetches real-time propagation data from hf.dxview.org
     * and updates the internal state accordingly.
     */
    void fetchDXViewData();

    /**
     * @brief Fetch solar weather data from SWPC.
     * 
     * This method fetches real-time solar weather data from swpc.noaa.gov
     * and updates the internal state accordingly.
     */
    void fetchSWPCData();

signals:
    /**
     * @brief Signal emitted when propagation conditions have been updated.
     * 
     * This signal is emitted after the updatePropagation() method has completed
     * updating the propagation conditions for all users.
     */
    void propagationUpdated();

    /**
     * @brief Signal emitted when the signal strength between two grid locators changes.
     * 
     * @param grid1 The first grid locator
     * @param grid2 The second grid locator
     * @param strength The new signal strength (0.0-1.0)
     */
    void signalStrengthChanged(const QString &grid1, const QString &grid2, float strength);

    /**
     * @brief Signal emitted when the Maximum Usable Frequency (MUF) changes.
     * 
     * @param muf The new MUF in MHz
     */
    void mufChanged(float muf);

    /**
     * @brief Signal emitted when external data is updated.
     * 
     * @param source The source of the data ("DXView" or "SWPC")
     * @param success Whether the update was successful
     */
    void externalDataUpdated(const QString &source, bool success);

private slots:
    /**
     * @brief Process the response from DXView.org.
     * 
     * This method processes the HTTP response from DXView.org
     * and updates the internal state with the propagation data.
     * 
     * @param reply The QNetworkReply containing the response
     */
    void processDXViewResponse(QNetworkReply *reply);

    /**
     * @brief Process the response from SWPC.
     * 
     * This method processes the HTTP response from SWPC
     * and updates the internal state with the solar weather data.
     * 
     * @param reply The QNetworkReply containing the response
     */
    void processSWPCResponse(QNetworkReply *reply);

private:
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
     * @brief Calculate the day/night path percentage.
     * 
     * Determines what percentage of the path between two points is in daylight.
     * This affects propagation characteristics, especially on lower bands.
     * 
     * @param lat1 The latitude of the first point
     * @param lon1 The longitude of the first point
     * @param lat2 The latitude of the second point
     * @param lon2 The longitude of the second point
     * @param dateTime The date and time for the calculation
     * @return The percentage of the path in daylight (0-1)
     */
    float calculateDayNightPath(float lat1, float lon1, float lat2, float lon2, const QDateTime &dateTime);

    /**
     * @brief Calculate the solar zenith angle.
     * 
     * The solar zenith angle is the angle between the sun and the zenith at a given
     * location and time. It's used to determine if a location is in daylight.
     * 
     * @param lat The latitude in degrees
     * @param lon The longitude in degrees
     * @param dateTime The date and time
     * @return The solar zenith angle in degrees
     */
    float calculateSolarZenithAngle(float lat, float lon, const QDateTime &dateTime);

    /**
     * @brief Calculate the Maximum Usable Frequency (MUF).
     * 
     * The MUF is the highest frequency that can be used for communication between
     * two points. It depends on distance, time of day, season, and solar activity.
     * 
     * @param distance The distance in kilometers
     * @param dayFraction The fraction of the path in daylight (0-1)
     * @param season The season (0=Winter, 1=Spring, 2=Summer, 3=Fall)
     * @param sfi The solar flux index
     * @return The MUF in MHz
     */
    float calculateMUF(float distance, float dayFraction, int season, int sfi);

    /**
     * @brief Calculate the Lowest Usable Frequency (LUF).
     * 
     * The LUF is the lowest frequency that can be used for communication between
     * two points. It depends on distance, time of day, and geomagnetic activity.
     * 
     * @param distance The distance in kilometers
     * @param dayFraction The fraction of the path in daylight (0-1)
     * @param kIndex The K-index
     * @return The LUF in MHz
     */
    float calculateLUF(float distance, float dayFraction, int kIndex);

    /**
     * @brief Convert a band in meters to frequency in MHz.
     * 
     * @param band The band in meters
     * @return The frequency in MHz
     */
    float bandToFrequency(int band) const;

    /**
     * @brief Convert a frequency in MHz to band in meters.
     * 
     * @param frequency The frequency in MHz
     * @return The closest amateur radio band in meters
     */
    int frequencyToBand(float frequency) const;

    /**
     * @brief Initialize band definitions.
     * 
     * Sets up the propagation characteristics for each HF band.
     */
    void initializeBandDefinitions();

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
    
    // Mutex for thread safety
    QMutex m_mutex;
    
    // Solar flux index (SFI)
    int m_solarFluxIndex;
    
    // K-index (geomagnetic activity)
    int m_kIndex;
    
    // Season (0=Winter, 1=Spring, 2=Summer, 3=Fall)
    int m_season;
    
    // Whether automatic time-of-day effects are enabled
    bool m_autoTimeEnabled;
    
    // External data sources
    bool m_useExternalData;       // Use external data sources
    bool m_useDXViewData;         // Use DXView.org data
    bool m_useSWPCData;           // Use SWPC data
    QDateTime m_lastExternalUpdate; // Last time external data was updated
    QNetworkAccessManager *m_networkManager; // For HTTP requests

    /**
     * @brief Band definition structure.
     * 
     * Contains the propagation characteristics for a specific amateur radio band.
     */
    struct BandDefinition {
        int band;           ///< Band in meters (160, 80, etc.)
        float frequency;    ///< Center frequency in MHz
        float minDistance;  ///< Minimum effective distance in km
        float maxDistance;  ///< Maximum effective distance in km
        float reliability;  ///< Base reliability factor (0.0 to 1.0)
        float dayFactor;    ///< Multiplier for daytime propagation
        float nightFactor;  ///< Multiplier for nighttime propagation
    };
    
    // List of band definitions
    QList<BandDefinition> m_bandDefinitions;
};

#endif // MUMBLE_MURMUR_HFBANDSIMULATION_H_