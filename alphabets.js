/**
 * alphabets.js
 * Contains Morse code mappings for different character sets
 */

const ALPHABETS = (function() {
    // International standard Morse code (letters and numbers)
    const internationalMorse = {
        'A': '.-',
        'B': '-...',
        'C': '-.-.',
        'D': '-..',
        'E': '.',
        'F': '..-.',
        'G': '--.',
        'H': '....',
        'I': '..',
        'J': '.---',
        'K': '-.-',
        'L': '.-..',
        'M': '--',
        'N': '-.',
        'O': '---',
        'P': '.--.',
        'Q': '--.-',
        'R': '.-.',
        'S': '...',
        'T': '-',
        'U': '..-',
        'V': '...-',
        'W': '.--',
        'X': '-..-',
        'Y': '-.--',
        'Z': '--..',
        '0': '-----',
        '1': '.----',
        '2': '..---',
        '3': '...--',
        '4': '....-',
        '5': '.....',
        '6': '-....',
        '7': '--...',
        '8': '---..',
        '9': '----.'
    };

    // Regional characters by country
    const regionalMorse = {
        // Norwegian
        'norway': {
            'Æ': '.-.-',
            'Ø': '---.',
            'Å': '.--.-'
        },
        // Swedish
        'sweden': {
            'Å': '.--.-',
            'Ä': '.-.-',
            'Ö': '---.'
        },
        // Northern Sámi
        'sami-northern': {
            'Á': '.-.-',    // Same as Ä
            'Č': '-.-.',    // Same as C
            'Đ': '-..',     // Same as D
            'Ŋ': '-.',      // Same as N
            'Š': '...',     // Same as S
            'Ŧ': '-',       // Same as T
            'Ž': '--..'     // Same as Z
        },
        // Southern Sámi
        'sami-southern': {
            'Ä': '.-.-',
            'Å': '.--.-',
            'Ï': '..',      // Same as I
            'Ö': '---.',
            'Ń': '-.',      // Same as N
            'Ŋ': '-.',      // Same as N
        },
        // Övdalian (Elfdalian)
        'ovdalian': {
            'Ä': '.-.-',
            'Å': '.--.-',
            'Ð': '..-.',    // Same as Eth in Icelandic
            'Ę': '..-..',   // Same as É
            'Į': '..',      // Same as I
            'Ȧ': '.-',      // Same as A
            'Ý': '-.--',    // Same as Y
            'Ń': '-.',      // Same as N
            'Ø': '---.',    // Same as Ø in Norwegian
            'Ę́': '..-...'   // Extended from É
        },
        // German
        'germany': {
            'Ä': '.-.-',
            'Ö': '---.',
            'Ü': '..--',
            'ß': '...--..'
        },
        // French
        'france': {
            'É': '..-..',
            'È': '.-..-',
            'Ç': '-.-..',
            'À': '.--.-',
            'Ù': '..--'
        },
        // Spanish
        'spain': {
            'Ñ': '--.--',
            'Á': '.--.-',
            'É': '..-..',
            'Í': '..',
            'Ó': '---',
            'Ú': '..--'
        },
        // Danish
        'denmark': {
            'Æ': '.-.-',
            'Ø': '---.',
            'Å': '.--.-'
        },
        // Finnish
        'finland': {
            'Å': '.--.-',
            'Ä': '.-.-',
            'Ö': '---.'
        },
        // Icelandic/Faroese/Elfdalian
        'iceland': {
            'Æ': '.-.-',
            'Ð': '..-.',  // Eth
            'Þ': '.--.', // Thorn
            'Á': '.--.-',
            'É': '..-..',
            'Í': '..',
            'Ó': '---',
            'Ú': '..--',
            'Ý': '-.--',
            'Ö': '---.'
        },
        // Faroe Islands
        'faroe': {
            'Æ': '.-.-',
            'Ð': '..-.',  // Eth
            'Ø': '---.',
            'Á': '.--.-',
            'Í': '..',
            'Ó': '---',
            'Ú': '..--',
            'Ý': '-.--'
        },
        // Italian
        'italy': {
            'È': '.-..-',
            'É': '..-..',
            'Ò': '---.',
            'Ç': '-.-...'
        },
        // Polish
        'poland': {
            'Ą': '.-.-',
            'Ć': '-.-..',
            'Ę': '..-..',
            'Ł': '.-..-',
            'Ń': '--.--',
            'Ó': '---.',
            'Ś': '...-...',
            'Ź': '--..-.',
            'Ż': '--..-'
        },
        // Czech
        'czech': {
            'Á': '.--.-',
            'Č': '-.-..',
            'Ď': '..-..',
            'É': '..-..',
            'Ě': '..-..',
            'Í': '..',
            'Ň': '--.--',
            'Ó': '---',
            'Ř': '.-..',
            'Š': '...-...',
            'Ť': '-.',
            'Ú': '..--',
            'Ů': '..--',
            'Ý': '-.--',
            'Ž': '--..'
        },
        // Russian (Cyrillic)
        'russian': {
            'А': '.-',      // A
            'Б': '-...',    // B
            'В': '.--',     // W
            'Г': '--.',     // G
            'Д': '-..',     // D
            'Е': '.',       // E
            'Ё': '.',       // Same as E
            'Ж': '...-',    // ZH
            'З': '--..',    // Z
            'И': '..',      // I
            'Й': '.---',    // J
            'К': '-.-',     // K
            'Л': '.-..',    // L
            'М': '--',      // M
            'Н': '-.',      // N
            'О': '---',     // O
            'П': '.--.',    // P
            'Р': '.-.',     // R
            'С': '...',     // S
            'Т': '-',       // T
            'У': '..-',     // U
            'Ф': '..-.',    // F
            'Х': '....',    // KH
            'Ц': '-.-.',    // TS
            'Ч': '---.',    // CH
            'Ш': '----',    // SH
            'Щ': '--.-',    // SHCH
            'Ъ': '-..-',    // Hard sign
            'Ы': '-.--',    // Y
            'Ь': '-..-',    // Soft sign
            'Э': '..-..',   // E
            'Ю': '..--',    // YU
            'Я': '.-.-'     // YA
        },
        // Japanese (Wabun Code for Katakana)
        'japanese-wabun': {
            'ア': '--.--',   // A
            'イ': '.-',      // I
            'ウ': '..-',     // U
            'エ': '-.---',   // E
            'オ': '.-...',   // O
            'カ': '.-.',     // KA
            'キ': '-.-..',   // KI
            'ク': '...-',    // KU
            'ケ': '-.--',    // KE
            'コ': '----',    // KO
            'サ': '-.-.-',   // SA
            'シ': '--.-.', // SHI
            'ス': '---.-',   // SU
            'セ': '.---.',   // SE
            'ソ': '---.',    // SO
            'タ': '-.',      // TA
            'チ': '..-.',    // CHI
            'ツ': '.--.',    // TSU
            'テ': '.-.--',   // TE
            'ト': '..-..',   // TO
            'ナ': '.-.',     // NA
            'ニ': '-.-.',    // NI
            'ヌ': '....',    // NU
            'ネ': '--.-',    // NE
            'ノ': '..--',    // NO
            'ハ': '-...',    // HA
            'ヒ': '--..-',   // HI
            'フ': '-..-',    // FU
            'ヘ': '.',       // HE
            'ホ': '-..',     // HO
            'マ': '-..-.',   // MA
            'ミ': '..-.-',   // MI
            'ム': '-',       // MU
            'メ': '-..--',   // ME
            'モ': '-..-.',   // MO
            'ヤ': '.--',     // YA
            'ユ': '-..--',   // YU
            'ヨ': '--',      // YO
            'ラ': '...',     // RA
            'リ': '-.-',     // RI
            'ル': '-.--.',   // RU
            'レ': '---',     // RE
            'ロ': '.-.-',    // RO
            'ワ': '-.-',     // WA
            'ヲ': '.---',    // WO
            'ン': '.-..',    // N
            '゛': '..',      // Dakuten (voiced sound mark)
            '゜': '..--.'    // Handakuten (semi-voiced sound mark)
        }
    };

    // Prosigns (procedural signals)
    const prosigns = {
        'AR': '.-.-.', // End of message
        'SK': '...-.-', // End of contact
        'BT': '-...-', // Break (new paragraph)
        'KN': '-.--.' // Go ahead, specific station
    };

    // Punctuation and special characters
    const specialCharacters = {
        '.': '.-.-.-',
        ',': '--..--',
        '?': '..--..',
        '!': '-.-.--',
        '/': '-..-.',
        '(': '-.--.',
        ')': '-.--.-',
        '&': '.-...',
        ':': '---...',
        ';': '-.-.-.',
        '=': '-...-',
        '+': '.-.-.',
        '-': '-....-',
        '_': '..--.-',
        '"': '.-..-.',
        '$': '...-..-',
        '@': '.--.-.',
        '\'': '.----.'
    };

    // Suggested learning order for international characters
    // Based on character frequency and learning difficulty
    const internationalLearningOrder = [
        'K', 'M', // First two characters to learn (distinct sounds)
        'R', 'S', 'U', 'A', 'T', // Common and simple patterns
        'O', 'E', 'I', 'N', 'D', // More common letters
        'W', 'G', 'H', 'J', 'P', // Medium difficulty
        'B', 'F', 'L', 'V', 'X', // Less common or more complex
        'C', 'Y', 'Z', 'Q', // Least common letters
        '5', '0', // Numbers starting with simplest
        '9', '1', '2', '3', '4', '6', '7', '8' // Remaining numbers
    ];

    // Learning order for regional characters by country (after mastering international)
    const regionalLearningOrder = {
        'norway': ['Æ', 'Ø', 'Å'],
        'sweden': ['Å', 'Ä', 'Ö'],
        'germany': ['Ä', 'Ö', 'Ü', 'ß'],
        'france': ['É', 'È', 'Ç', 'À', 'Ù'],
        'spain': ['Ñ', 'Á', 'É', 'Í', 'Ó', 'Ú'],
        'denmark': ['Æ', 'Ø', 'Å'],
        'finland': ['Å', 'Ä', 'Ö'],
        'iceland': ['Æ', 'Ð', 'Þ', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Ý', 'Ö'],
        'faroe': ['Æ', 'Ð', 'Ø', 'Á', 'Í', 'Ó', 'Ú', 'Ý'],
        'italy': ['È', 'É', 'Ò', 'Ç'],
        'poland': ['Ą', 'Ć', 'Ę', 'Ł', 'Ń', 'Ó', 'Ś', 'Ź', 'Ż'],
        'czech': ['Á', 'Č', 'Ď', 'É', 'Ě', 'Í', 'Ň', 'Ó', 'Ř', 'Š', 'Ť', 'Ú', 'Ů', 'Ý', 'Ž'],
        'sami-northern': ['Á', 'Č', 'Đ', 'Ŋ', 'Š', 'Ŧ', 'Ž'],
        'sami-southern': ['Ä', 'Å', 'Ï', 'Ö', 'Ń', 'Ŋ'],
        'ovdalian': ['Ä', 'Å', 'Ð', 'Ę', 'Į', 'Ȧ', 'Ý', 'Ń', 'Ø', 'Ę́'],
        'russian': ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'Й', 'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь', 'Э', 'Ю', 'Я'],
        'japanese-wabun': [
            'ア', 'イ', 'ウ', 'エ', 'オ',  // A I U E O
            'カ', 'キ', 'ク', 'ケ', 'コ',  // KA KI KU KE KO
            'サ', 'シ', 'ス', 'セ', 'ソ',  // SA SHI SU SE SO
            'タ', 'チ', 'ツ', 'テ', 'ト',  // TA CHI TSU TE TO
            'ナ', 'ニ', 'ヌ', 'ネ', 'ノ',  // NA NI NU NE NO
            'ハ', 'ヒ', 'フ', 'ヘ', 'ホ',  // HA HI FU HE HO
            'マ', 'ミ', 'ム', 'メ', 'モ',  // MA MI MU ME MO
            'ヤ', 'ユ', 'ヨ',              // YA YU YO
            'ラ', 'リ', 'ル', 'レ', 'ロ',  // RA RI RU RE RO
            'ワ', 'ヲ', 'ン',              // WA WO N
            '゛', '゜'                     // Dakuten, Handakuten
        ]
    };

    // Learning order for prosigns (after mastering letters and numbers)
    const prosignsLearningOrder = ['AR', 'SK', 'BT', 'KN'];

    // Learning order for special characters (after mastering letters and numbers)
    const specialCharactersLearningOrder = [
        '.', ',', '?', '/', // Most common punctuation first
        '!', ':', ';', '(', ')', // Secondary punctuation
        '=', '+', '-', '@', // Mathematical and common symbols
        '&', '_', '"', '$', '\'' // Less common symbols
    ];

    // Chinese Telegraph Code (for reference - used with standard Morse for digits)
    const chineseTelegraphCode = {
        // This is just a small sample of the full Chinese Telegraph Code
        // In practice, this would be a much larger mapping of Chinese characters to 4-digit codes
        '中': '0022',
        '国': '1819',
        '人': '0086',
        '我': '3060',
        '你': '4695',
        '好': '1025',
        '是': '0196',
        '的': '0147',
        '了': '0211',
        '在': '0762'
        // Full implementation would include thousands of characters
    };

    /**
     * Get all Morse code mappings for a specific country
     * @param {string} country - The country code (e.g., 'international', 'norway', 'germany', etc.)
     * @returns {Object} Combined Morse code mappings
     */
    function getMorseAlphabet(country) {
        let alphabet = { ...internationalMorse };
        
        // Add regional characters based on country
        if (country !== 'international' && regionalMorse[country]) {
            alphabet = { ...alphabet, ...regionalMorse[country] };
        }
        
        // Special handling for Chinese Telegraph Code mode
        if (country === 'chinese-telegraph') {
            // For Chinese Telegraph Code, we use the standard Morse for digits
            // The UI would display the 4-digit code and the corresponding character
            return { ...internationalMorse };
        }
        
        return alphabet;
    }

    /**
     * Get all Morse code mappings including special characters and prosigns
     * @returns {Object} Complete Morse code mappings
     */
    function getCompleteMorseAlphabet() {
        let completeAlphabet = {
            ...internationalMorse,
            ...prosigns,
            ...specialCharacters
        };
        
        // Add all regional characters from all countries
        Object.values(regionalMorse).forEach(countryChars => {
            completeAlphabet = { ...completeAlphabet, ...countryChars };
        });
        
        return completeAlphabet;
    }

    /**
     * Get the learning order for a specific country and stage
     * @param {string} country - The country code (e.g., 'international', 'norway', 'germany', etc.)
     * @param {number} stage - The learning stage (1: core, 2: regional, 3: prosigns, 4: special)
     * @returns {Array} Array of characters in recommended learning order
     */
    function getLearningOrder(country, stage) {
        switch (stage) {
            case 1: // Core international
                return internationalLearningOrder;
            case 2: // Regional characters
                return (country !== 'international' && regionalLearningOrder[country]) 
                    ? regionalLearningOrder[country] 
                    : [];
            case 3: // Prosigns
                return prosignsLearningOrder;
            case 4: // Special characters
                return specialCharactersLearningOrder;
            default:
                return internationalLearningOrder;
        }
    }

    /**
     * Convert a character to its Morse code representation
     * @param {string} char - The character to convert
     * @param {string} country - The country code (optional)
     * @returns {string} Morse code representation or empty string if not found
     */
    function charToMorse(char, country) {
        const upperChar = char.toUpperCase();
        
        // Special handling for Chinese Telegraph Code
        if (country === 'chinese-telegraph' && chineseTelegraphCode[char]) {
            // Convert the 4-digit code to Morse (each digit individually)
            const code = chineseTelegraphCode[char];
            return code.split('').map(digit => internationalMorse[digit]).join(' ');
        }
        
        const completeAlphabet = getCompleteMorseAlphabet();
        return completeAlphabet[upperChar] || '';
    }

    /**
     * Convert a Morse code sequence to its character representation
     * @param {string} morse - The Morse code sequence
     * @param {string} country - The country code (optional)
     * @returns {string} Character representation or empty string if not found
     */
    function morseToChar(morse, country) {
        // Special handling for Chinese Telegraph Code
        if (country === 'chinese-telegraph') {
            // This would be more complex in a real implementation
            // We'd need to collect 4 digits and then look up the character
            return '';
        }
        
        const completeAlphabet = getCompleteMorseAlphabet();
        for (const [char, code] of Object.entries(completeAlphabet)) {
            if (code === morse) {
                return char;
            }
        }
        return '';
    }

    /**
     * Get Chinese character from telegraph code
     * @param {string} code - The 4-digit telegraph code
     * @returns {string} Chinese character or empty string if not found
     */
    function telegraphCodeToChar(code) {
        for (const [char, charCode] of Object.entries(chineseTelegraphCode)) {
            if (charCode === code) {
                return char;
            }
        }
        return '';
    }

    /**
     * Get telegraph code for a Chinese character
     * @param {string} char - The Chinese character
     * @returns {string} 4-digit telegraph code or empty string if not found
     */
    function charToTelegraphCode(char) {
        return chineseTelegraphCode[char] || '';
    }

    // Public API
    return {
        getMorseAlphabet,
        getCompleteMorseAlphabet,
        getLearningOrder,
        charToMorse,
        morseToChar,
        telegraphCodeToChar,
        charToTelegraphCode
    };
})();