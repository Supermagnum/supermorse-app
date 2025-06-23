/**
 * User.js
 * Sequelize model for user data
 */

const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create Sequelize instance
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mysql',
        logging: process.env.DB_SAFE_MODE === 'true' ? console.log : false
    }
);

// Define User model
const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    maidenheadLocator: {
        type: DataTypes.STRING,
        allowNull: true
    },
    preferredBand: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'auto'
    },
    lastLogin: {
        type: DataTypes.DATE,
        allowNull: true
    }
});

// Define Progress model
const Progress = sequelize.define('Progress', {
    id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    learnedCharacters: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
            const value = this.getDataValue('learnedCharacters');
            return value ? JSON.parse(value) : [];
        },
        set(value) {
            this.setDataValue('learnedCharacters', JSON.stringify(value));
        }
    },
    currentCharacter: {
        type: DataTypes.STRING,
        allowNull: true
    },
    mastery: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
            const value = this.getDataValue('mastery');
            return value ? JSON.parse(value) : {};
        },
        set(value) {
            this.setDataValue('mastery', JSON.stringify(value));
        }
    },
    sessionStats: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
            const value = this.getDataValue('sessionStats');
            return value ? JSON.parse(value) : {};
        },
        set(value) {
            this.setDataValue('sessionStats', JSON.stringify(value));
        }
    },
    lastSessionTime: {
        type: DataTypes.DATE,
        allowNull: true
    },
    totalSessionTime: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
});

// Define CharacterStat model for detailed learning time tracking
const CharacterStat = sequelize.define('CharacterStat', {
    id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    character: {
        type: DataTypes.STRING,
        allowNull: false
    },
    timeToLearn: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    correctCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    incorrectCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    lastPracticed: {
        type: DataTypes.DATE,
        allowNull: true
    }
});

// Define relationships
User.hasOne(Progress, { foreignKey: 'userId', onDelete: 'CASCADE' });
Progress.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(CharacterStat, { foreignKey: 'userId', onDelete: 'CASCADE' });
CharacterStat.belongsTo(User, { foreignKey: 'userId' });

// Password hashing middleware
User.beforeCreate(async (user) => {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
});

User.beforeUpdate(async (user) => {
    if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
    }
});

// Add method to compare passwords
User.prototype.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Create the tables if they don't exist
async function initDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
        
        // Create tables
        await sequelize.sync();
        console.log('Database models synchronized.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

module.exports = {
    sequelize,
    User,
    Progress,
    CharacterStat,
    initDatabase
};