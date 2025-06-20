// ==UserScript==
// @name          MehBook Mode (Grayscale with Dark Mode)
// @namespace     https://github.com/abenteuerzeit/userscripts
// @version       2025-06-20-v7
// @description   Toggle between MehBook (grayscale) and Text-Book modes on Facebook, with dark mode support for a text-centric, low-dopamine experience
// @author        abenteuerzeit
// @match         https://*.facebook.com/*
// @icon          https://www.facebook.com/favicon.ico
// @grant         none
// @run-at        document-start
// @homepageURL   https://github.com/abenteuerzeit/userscripts
// @supportURL    https://github.com/abenteuerzeit/userscripts/issues
// @updateURL     https://raw.githubusercontent.com/abenteuerzeit/userscripts/development/facebook-to-mehbook.js
// @downloadURL   https://raw.githubusercontent.com/abenteuerzeit/userscripts/development/facebook-to-mehbook.js
// ==/UserScript==

(function() {
    'use strict';

    const style = document.createElement('style');
    style.id = 'boring-mode-style';
    style.textContent = `
        /* Disable animations and transitions globally */
        * {
            animation: none !important;
            transition: none !important;
        }

        /* Grayscale mode (default) */
        .boring-grayscale html, .boring-grayscale body, .boring-grayscale #content, .boring-grayscale #pagelet_bluebar, .boring-grayscale #globalContainer {
            filter: grayscale(100%) brightness(0.85) contrast(0.7) saturate(0.5) !important;
            background-color: #121212 !important; /* Changed from #f0f0f0 to a very dark background */
            color: #eee !important; /* Light text for dark background */
        }

        /* Text-Book mode - light variant replaced with dark gray */
        .boring-textbook:not(.dark-mode) html,
        .boring-textbook:not(.dark-mode) body,
        .boring-textbook:not(.dark-mode) #content,
        .boring-textbook:not(.dark-mode) #pagelet_bluebar,
        .boring-textbook:not(.dark-mode) #globalContainer {
            filter: grayscale(100%) contrast(200%) brightness(90%) !important;
            background-color: #222222 !important; /* Dark gray instead of white */
            color: #ddd !important; /* Light gray text */
        }
        .boring-textbook:not(.dark-mode) a,
        .boring-textbook:not(.dark-mode) span,
        .boring-textbook:not(.dark-mode) div,
        .boring-textbook:not(.dark-mode) p,
        .boring-textbook:not(.dark-mode) h1,
        .boring-textbook:not(.dark-mode) h2,
        .boring-textbook:not(.dark-mode) h3,
        .boring-textbook:not(.dark-mode) h4,
        .boring-textbook:not(.dark-mode) h5,
        .boring-textbook:not(.dark-mode) h6,
        .boring-textbook:not(.dark-mode) li {
            color: #ddd !important; /* Light gray text */
            background-color: #333333 !important; /* Medium dark gray background */
        }
        .boring-textbook:not(.dark-mode) img,
        .boring-textbook:not(.dark-mode) video {
            filter: grayscale(100%) contrast(200%) brightness(90%) !important;
        }

        /* Text-Book mode - dark variant */
        .boring-textbook.dark-mode html,
        .boring-textbook.dark-mode body,
        .boring-textbook.dark-mode #content,
        .boring-textbook.dark-mode #pagelet_bluebar,
        .boring-textbook.dark-mode #globalContainer {
            filter: grayscale(100%) contrast(140%) brightness(85%) !important;
            background-color: #2e2e2e !important; /* softer dark gray */
            color: #c0c0c0 !important; /* softer light gray */
        }
        
        .boring-textbook.dark-mode a,
        .boring-textbook.dark-mode span,
        .boring-textbook.dark-mode div,
        .boring-textbook.dark-mode p,
        .boring-textbook.dark-mode h1,
        .boring-textbook.dark-mode h2,
        .boring-textbook.dark-mode h3,
        .boring-textbook.dark-mode h4,
        .boring-textbook.dark-mode h5,
        .boring-textbook.dark-mode h6,
        .boring-textbook.dark-mode li {
            color: #c0c0c0 !important; /* softer light gray */
            background-color: transparent !important;
        }
        
        .boring-textbook.dark-mode img,
        .boring-textbook.dark-mode video {
            filter: grayscale(100%) contrast(130%) brightness(80%) !important;
        }

        /* Toggle button */
        #boring-toggle-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 99999;
            background: #222;
            color: white;
            border: none;
            padding: 10px 15px;
            font-size: 14px;
            border-radius: 5px;
            cursor: pointer;
            user-select: none;
            opacity: 0.7;
            transition: opacity 0.2s ease;
        }
        #boring-toggle-btn:hover {
            opacity: 1;
        }

        /* Dark mode indicator on toggle button */
        #dark-mode-toggle-btn {
            position: fixed;
            bottom: 60px;
            right: 20px;
            z-index: 99999;
            background: #222;
            color: white;
            border: none;
            padding: 8px 12px;
            font-size: 12px;
            border-radius: 5px;
            cursor: pointer;
            user-select: none;
            opacity: 0.7;
            transition: opacity 0.2s ease;
        }
        #dark-mode-toggle-btn:hover {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);

    document.documentElement.classList.add('boring-grayscale');

    const modeBtn = document.createElement('button');
    modeBtn.id = 'boring-toggle-btn';
    modeBtn.textContent = 'Mode: Grayscale';

    const darkModeBtn = document.createElement('button');
    darkModeBtn.id = 'dark-mode-toggle-btn';
    darkModeBtn.textContent = 'Dark Mode: Off';
    darkModeBtn.style.display = 'none';

    let darkMode = true;

    modeBtn.addEventListener('click', () => {
        if (document.documentElement.classList.contains('boring-grayscale')) {
            document.documentElement.classList.remove('boring-grayscale');
            document.documentElement.classList.add('boring-textbook');

            darkModeBtn.style.display = 'block';

            modeBtn.textContent = 'Mode: Text-Book';

            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                darkMode = true;
                document.documentElement.classList.add('dark-mode');
                darkModeBtn.textContent = 'Dark Mode: On';
            } else {
                darkMode = false;
                document.documentElement.classList.remove('dark-mode');
                darkModeBtn.textContent = 'Dark Mode: Off';
            }
        } else {
            document.documentElement.classList.remove('boring-textbook', 'dark-mode');
            darkModeBtn.style.display = 'none';
            modeBtn.textContent = 'Mode: Grayscale';
        }
    });

    darkModeBtn.addEventListener('click', () => {
        darkMode = !darkMode;
        if (darkMode) {
            document.documentElement.classList.add('dark-mode');
            darkModeBtn.textContent = 'Dark Mode: On';
        } else {
            document.documentElement.classList.remove('dark-mode');
            darkModeBtn.textContent = 'Dark Mode: Off';
        }
    });

    function addButtons() {
        if (document.body) {
            document.body.appendChild(modeBtn);
            document.body.appendChild(darkModeBtn);
        } else {
            setTimeout(addButtons, 50);
        }
    }
    addButtons();
})();
