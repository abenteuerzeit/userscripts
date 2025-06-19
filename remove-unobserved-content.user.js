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

  const CONFIG = {
    TARGET_TEXTS: [
      "Obserwuj",
      "Rolki i krótkie filmy",
      "Suivre",
      "Follow"
    ],
    PARENT_LEVELS: 12,
    THROTTLE_DELAY: 100,
    INIT_DELAY: 1000,
    DEBUG: false,
    USE_ADVICE_API: true, // Feature flag for advice API
  };

  const state = {
    observer: null,
    processedElements: new WeakSet(),
    isProcessing: false,
    throttleTimer: null,
  };

  const logDebug = (msg, data = "") => {
    if (CONFIG.DEBUG) {
      const stack = new Error().stack?.split("\n");
      const callerLine = stack && stack[2] ? stack[2].trim() : "unknown";
      const functionNameMatch = callerLine.match(/at (\S+)/);
      const functionName = functionNameMatch ? functionNameMatch[1] : "anonymous";
      
      console.log(`[Remove Unobserved] [${functionName}] ${msg}`, data);
    }
  };

  const getAdvice = async () => {
    try {
      const response = await fetch('https://api.adviceslip.com/advice');
      const data = await response.json();
      return `"${data.slip.advice}"`;
    } catch (error) {
      logDebug("Failed to fetch advice", error);
      return "Ukryto sugerowaną treść.";
    }
  };

  const createReplacementDiv = async () => {
    const subtleMessageDiv = document.createElement("div");
    subtleMessageDiv.style.backgroundColor = "transparent";
    subtleMessageDiv.style.color = "#666";
    subtleMessageDiv.style.padding = "0.5em";
    subtleMessageDiv.style.borderRadius = "6px";
    subtleMessageDiv.style.margin = "0.25em 0";
    subtleMessageDiv.style.fontSize = "0.9em";
    subtleMessageDiv.style.fontStyle = "italic";

    if (CONFIG.USE_ADVICE_API) {
      subtleMessageDiv.textContent = "Pobieranie mądrości...";
      const advice = await getAdvice();
      subtleMessageDiv.textContent = advice;
    } else {
      subtleMessageDiv.textContent = "Ukryto sugerowaną treść.";
    }

    return subtleMessageDiv;
  };

  const removeMatchingContent = async () => {
    if (state.isProcessing) return;
    state.isProcessing = true;

    try {
      const spans = document.querySelectorAll("span");

      for (const span of spans) {
        const match = CONFIG.TARGET_TEXTS.find(txt => span.textContent?.trim().startsWith(txt));
        if (!match || state.processedElements.has(span)) continue;

        state.processedElements.add(span);

        let targetElement = span;
        for (let i = 0; i < CONFIG.PARENT_LEVELS && targetElement?.parentElement; i++) {
          targetElement = targetElement.parentElement;
        }

        if (targetElement?.tagName === "DIV") {
          const replacementDiv = await createReplacementDiv();
          targetElement.replaceWith(replacementDiv);
          logDebug("Replaced div with placeholder", replacementDiv);
        }
      }
    } catch (error) {
      console.error("[Remove Unobserved] Error:", error);
    } finally {
      state.isProcessing = false;
    }
  };

  const scheduleRemoval = () => {
    if (state.throttleTimer) clearTimeout(state.throttleTimer);
    state.throttleTimer = setTimeout(() => requestAnimationFrame(removeMatchingContent), CONFIG.THROTTLE_DELAY);
  };

  const containsTarget = node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const spans = node.querySelectorAll?.("span") ?? [];
    return Array.from(spans).some(span => CONFIG.TARGET_TEXTS.some(txt => span.textContent?.trim().startsWith(txt)));
  };

  const startObserver = () => {
    state.observer = new MutationObserver(mutations => {
      for (const { addedNodes } of mutations) {
        if ([...addedNodes].some(containsTarget)) {
          logDebug("Detected new target content");
          scheduleRemoval();
          break;
        }
      }
    });

    state.observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  };

  const start = () => {
    setTimeout(() => {
      removeMatchingContent();
      startObserver();
    }, CONFIG.INIT_DELAY);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  window.addEventListener("beforeunload", () => {
    if (state.observer) state.observer.disconnect();
    if (state.throttleTimer) clearTimeout(state.throttleTimer);
  });
})();
