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

  const exactMatchTexts = ["Obserwuj", "Rolki i krótkie filmy"];
  const substringMatchTexts = ["grupy, które mogą Ci się spodoba"];
  const maxParentTraversal = 12;
  const throttleDelayMs = 100;
  const initialDelayMs = 1000;
  const enableDebugLogs = true;

  let mutationObserver = null;
  let elementsProcessed = new WeakSet();
  let currentlyProcessing = false;
  let throttleTimeout = null;

  function logDebug(message, data = "") {
    if (enableDebugLogs) {
      console.log(`[Remove Unobserved] ${message}`, data);
    }
  }

  function replaceDivWithSubtleMessage(spanElement) {
    if (elementsProcessed.has(spanElement)) return false;
    elementsProcessed.add(spanElement);

    let targetElement = spanElement;
    for (let i = 0; i < maxParentTraversal && targetElement?.parentElement; i++) {
      targetElement = targetElement.parentElement;
    }

    if (targetElement?.tagName === "DIV") {
      const subtleMessageDiv = document.createElement("div");
      subtleMessageDiv.style.backgroundColor = "transparent";
      subtleMessageDiv.style.color = "#666";
      subtleMessageDiv.style.padding = "0.5em";
      subtleMessageDiv.style.border = "1px dashed #ccc";
      subtleMessageDiv.style.borderRadius = "6px";
      subtleMessageDiv.style.margin = "0.25em 0";
      subtleMessageDiv.style.fontSize = "0.9em";
      subtleMessageDiv.style.fontStyle = "italic";
      subtleMessageDiv.textContent = "This content has been removed.";

      targetElement.replaceWith(subtleMessageDiv);
      logDebug("Replaced div with subtle placeholder", subtleMessageDiv);
      return true;
    }
    return false;
  }

  function processUnobservedContent() {
    if (currentlyProcessing) {
      logDebug("Skipping process because previous one is still running");
      return 0;
    }

    currentlyProcessing = true;
    logDebug("Started processing unobserved content");

    try {
      const allSpans = document.querySelectorAll("span");
      let replacedElementsCount = 0;

      for (const span of allSpans) {
        const trimmedText = span.textContent?.trim() || "";

        const exactMatchFound = exactMatchTexts.includes(trimmedText);
        const substringMatchFound = substringMatchTexts.some(sub => trimmedText.includes(sub));

        if ((exactMatchFound || substringMatchFound) && !elementsProcessed.has(span)) {
          if (replaceDivWithSubtleMessage(span)) {
            replacedElementsCount++;
          }
        }
      }

      if (replacedElementsCount > 0) {
        logDebug(`Replaced ${replacedElementsCount} unobserved content divs`);
      }

      return replacedElementsCount;
    } catch (error) {
      console.error("[Remove Unobserved] Error processing content:", error);
      return 0;
    } finally {
      currentlyProcessing = false;
    }
  }

  function scheduleThrottledProcessing() {
    if (throttleTimeout) {
      clearTimeout(throttleTimeout);
    }
    throttleTimeout = setTimeout(() => {
      requestAnimationFrame(processUnobservedContent);
    }, throttleDelayMs);
  }

  function nodeContainsTargetSpan(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;

    const spans = node.querySelectorAll?.("span");
    if (!spans) return false;

    for (const span of spans) {
      const text = span.textContent?.trim() || "";
      if (exactMatchTexts.includes(text)) return true;
      if (substringMatchTexts.some(sub => text.includes(sub))) return true;
    }

    return false;
  }

  function startMutationObserver() {
    if (mutationObserver) {
      mutationObserver.disconnect();
    }

    mutationObserver = new MutationObserver(mutations => {
      let foundNewTarget = false;

      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (nodeContainsTargetSpan(node)) {
              foundNewTarget = true;
              break;
            }
          }
          if (foundNewTarget) break;
        }
      }

      if (foundNewTarget) {
        logDebug("Detected new target content, scheduling processing");
        scheduleThrottledProcessing();
      }
    });

    mutationObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });

    logDebug("Mutation observer started");
  }

  function cleanUpOnUnload() {
    logDebug("Cleaning up before unload");
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    if (throttleTimeout) {
      clearTimeout(throttleTimeout);
      throttleTimeout = null;
    }
  }

  function initializeScript() {
    logDebug("Initializing Remove Unobserved Content script");

    function startProcessing() {
      logDebug("Executing initial processing");
      setTimeout(() => {
        processUnobservedContent();
        startMutationObserver();
      }, initialDelayMs);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startProcessing);
    } else if (document.readyState === "interactive") {
      setTimeout(startProcessing, 500);
    } else {
      startProcessing();
    }

    window.addEventListener("load", () => {
      logDebug("Window loaded; confirming script operation");
      if (!mutationObserver) {
        setTimeout(() => {
          processUnobservedContent();
          startMutationObserver();
        }, 500);
      }
    });

    window.addEventListener("beforeunload", cleanUpOnUnload);

    logDebug("Script initialization complete");
  }

  initializeScript();
})();
