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
      "Rolki i krótkie filmy"
    ],
    PARENT_LEVELS: 12,
    THROTTLE_DELAY: 100,
    INIT_DELAY: 1000,
    DEBUG: true
  };

  const state = {
    observer: null,
    processedElements: new WeakSet(),
    isProcessing: false,
    throttleTimer: null
  };

  const debug = (msg, data = "") => CONFIG.DEBUG && console.log(`[Remove Unobserved] ${msg}`, data);

  const createPlaceholder = () => {
    const notice = document.createElement("div");
    notice.textContent = "Ukryto sugerowaną treść";
    Object.assign(notice.style, {
      background: "#f0f2f5",
      color: "#606770",
      fontSize: "14px",
      padding: "12px",
      margin: "12px 0",
      borderRadius: "8px",
      textAlign: "center",
      fontStyle: "italic"
    });
    return notice;
  };

  const removeAndReplaceContent = () => {
    if (state.isProcessing) return;
    state.isProcessing = true;
    debug("Scanning for unwanted content...");

    const spans = document.querySelectorAll("span");
    let removed = 0;

    for (const span of spans) {
      if (CONFIG.TARGET_TEXTS.includes(span.textContent.trim()) && !state.processedElements.has(span)) {
        state.processedElements.add(span);

        let target = span;
        for (let i = 0; i < CONFIG.PARENT_LEVELS && target?.parentElement; i++) {
          target = target.parentElement;
        }

        if (target?.tagName === "DIV") {
          const replacement = createPlaceholder();
          target.replaceWith(replacement);
          debug("Replaced unwanted content block", target);
          removed++;
        }
      }
    }

    if (removed) debug(`Total replaced: ${removed}`);
    state.isProcessing = false;
  };

  const throttleRemove = () => {
    clearTimeout(state.throttleTimer);
    state.throttleTimer = setTimeout(() => requestAnimationFrame(removeAndReplaceContent), CONFIG.THROTTLE_DELAY);
  };

  const containsTarget = node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const spans = node.querySelectorAll?.("span") || [];
    return Array.from(spans).some(span => CONFIG.TARGET_TEXTS.includes(span.textContent.trim()));
  };

  const observeMutations = () => {
    state.observer?.disconnect();
    state.observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if ([...mutation.addedNodes].some(containsTarget)) {
          throttleRemove();
          break;
        }
      }
    });

    state.observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    debug("Observer initialized");
  };

  const initialize = () => {
    debug("Initializing script");
    const launch = () => setTimeout(() => {
      removeAndReplaceContent();
      observeMutations();
    }, CONFIG.INIT_DELAY);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", launch);
    } else {
      launch();
    }

    window.addEventListener("load", () => !state.observer && setTimeout(() => {
      removeAndReplaceContent();
      observeMutations();
    }, 500));

    window.addEventListener("beforeunload", () => {
      state.observer?.disconnect();
      clearTimeout(state.throttleTimer);
    });
  };

  initialize();
})();
