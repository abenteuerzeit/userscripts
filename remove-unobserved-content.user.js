// ==UserScript==
// @name         Remove Unobserved Content
// @namespace    https://github.com/abenteuerzeit/userscripts
// @version      2025-06-19
// @description  Automatically remove divs containing unobserved content from social media feeds
// @author       abenteuerzeit
// @match        https://*/*
// @match        http://*/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @run-at       document-idle
// @homepageURL  https://github.com/abenteuerzeit/userscripts
// @supportURL   https://github.com/abenteuerzeit/userscripts/issues
// @updateURL    https://raw.githubusercontent.com/abenteuerzeit/userscripts/main/remove-unobserved-content.user.js
// @downloadURL  https://raw.githubusercontent.com/abenteuerzeit/userscripts/main/remove-unobserved-content.user.js
// ==/UserScript==

(function () {
  "use strict";

  // Configuration
  const CONFIG = {
    TARGET_TEXT: "Obserwuj",
    PARENT_LEVELS: 12,
    THROTTLE_DELAY: 100,
    DEBUG: true, // Enable debug for troubleshooting
    INIT_DELAY: 1000, // Wait 1 second before starting
  };

  // State management
  const state = {
    observer: null,
    processedElements: new WeakSet(),
    isProcessing: false,
    throttleTimer: null,
  };

  /**
   * Log debug messages
   * @param {string} message - Debug message
   * @param {*} data - Optional data to log
   */
  function debug(message, data = "") {
    if (CONFIG.DEBUG) {
      console.log(`[Remove Unobserved] ${message}`, data);
    }
  }

  /**
   * Find and remove divs containing unobserved content
   * @returns {number} Number of removed elements
   */
  function removeUnobservedContent() {
    if (state.isProcessing) {
      debug("Already processing, skipping...");
      return 0;
    }

    state.isProcessing = true;
    debug("Starting content removal process");

    try {
      const targetSpans = document.querySelectorAll("span");
      let removedCount = 0;

      for (const span of targetSpans) {
        if (
          span.textContent?.trim() === CONFIG.TARGET_TEXT &&
          !state.processedElements.has(span)
        ) {
          state.processedElements.add(span);

          // Navigate up the DOM tree
          let currentElement = span;
          for (
            let i = 0;
            i < CONFIG.PARENT_LEVELS && currentElement?.parentElement;
            i++
          ) {
            currentElement = currentElement.parentElement;
          }

          // Remove if it's a div
          if (currentElement?.tagName === "DIV") {
            debug("Removing div", currentElement);
            currentElement.remove();
            removedCount++;
          }
        }
      }

      if (removedCount > 0) {
        debug(`Successfully removed ${removedCount} unobserved content divs`);
      }

      return removedCount;
    } catch (error) {
      console.error("[Remove Unobserved] Error during content removal:", error);
      return 0;
    } finally {
      state.isProcessing = false;
    }
  }

  /**
   * Throttled version of removeUnobservedContent
   */
  function throttledRemoval() {
    if (state.throttleTimer) {
      clearTimeout(state.throttleTimer);
    }

    state.throttleTimer = setTimeout(() => {
      requestAnimationFrame(removeUnobservedContent);
    }, CONFIG.THROTTLE_DELAY);
  }

  /**
   * Check if a node contains target spans
   * @param {Node} node - DOM node to check
   * @returns {boolean} True if node contains target spans
   */
  function containsTargetSpans(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;

    const spans = node.querySelectorAll?.("span");
    if (!spans) return false;

    for (const span of spans) {
      if (span.textContent?.trim() === CONFIG.TARGET_TEXT) {
        return true;
      }
    }
    return false;
  }

  /**
   * Initialize the mutation observer
   */
  function initializeObserver() {
    if (state.observer) {
      state.observer.disconnect();
    }

    state.observer = new MutationObserver((mutations) => {
      let shouldProcess = false;

      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (containsTargetSpans(node)) {
              shouldProcess = true;
              break;
            }
          }
          if (shouldProcess) break;
        }
      }

      if (shouldProcess) {
        debug("New content detected, scheduling removal");
        throttledRemoval();
      }
    });

    // Start observing
    state.observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });

    debug("Observer initialized and started");
  }

  /**
   * Clean up resources
   */
  function cleanup() {
    debug("Cleaning up resources");

    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    if (state.throttleTimer) {
      clearTimeout(state.throttleTimer);
      state.throttleTimer = null;
    }
  }

  /**
   * Initialize the script
   */
  function initialize() {
    debug("Initializing Remove Unobserved Content script");

    // Multiple fallbacks for DOM readiness
    const startScript = () => {
      debug("Starting script execution");
      setTimeout(() => {
        removeUnobservedContent();
        initializeObserver();
      }, CONFIG.INIT_DELAY);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startScript);
    } else if (document.readyState === "interactive") {
      setTimeout(startScript, 500);
    } else {
      // Document is already complete
      startScript();
    }

    // Additional fallback - wait for window load
    window.addEventListener("load", () => {
      debug("Window loaded, ensuring script is running");
      if (!state.observer) {
        setTimeout(() => {
          removeUnobservedContent();
          initializeObserver();
        }, 500);
      }
    });

    // Cleanup on page unload
    window.addEventListener("beforeunload", cleanup);

    debug("Script initialization complete");
  }

  // Start the script
  initialize();
})();

