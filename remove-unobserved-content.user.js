// ==UserScript==
// @name         Filter Out Unobserved or Upsetting Facebook Content
// @namespace    https://github.com/abenteuerzeit/userscripts
// @version      2025-06-20-hybrid
// @description  Remove suggested or emotionally charged Facebook content (like "Follow" or angry/sad reactions) with hybrid logic
// @author       abenteuerzeit
// @match        https://*.facebook.com/*
// @grant        none
// @run-at       document-idle
// @homepageURL  https://github.com/abenteuerzeit/userscripts
// @supportURL   https://github.com/abenteuerzeit/userscripts/issues
// @updateURL    https://raw.githubusercontent.com/abenteuerzeit/userscripts/main/remove-unobserved-content.user.js
// @downloadURL  https://raw.githubusercontent.com/abenteuerzeit/userscripts/main/remove-unobserved-content.user.js
// ==/UserScript==

(function () {
  "use strict";

  const config = {
    matchTexts: [
      "Obserwuj",        // Polish "Follow"
      "Follow",          // English
      "Suivre",           // French
      "Rolki"
    ],
    reactionLabels: [
      "Wrr:",            // angry
      "Smutne:",         // sad
      "Strach:"          // fear
    ],
    throttleMs: 50,
    initDelayMs: 500,
    isDebugMode: false,
    maxTraversalDepth: 20,
    replacementMessages: {
      follow: "Cleared noise",
      reaction: "Cleared bad vibes",
      default: "Cleared crap content"
    }
  };

  const runtime = {
    observer: null,
    seen: new WeakSet(),
    isBusy: false,
    throttleId: null,
    processedContainers: new WeakSet()
  };

  const logDebug = (msg, data = "") => {
    if (!config.isDebugMode) return;
    if (data) console.log(`[FilterOut] ${msg}`, data);
    else console.log(`[FilterOut] ${msg}`);
  };

  function findPostContainer(el) {
    let current = el;
    let depth = 0;
    while (current && current !== document.body && depth < config.maxTraversalDepth) {
      if (
        current.hasAttribute('aria-posinset') && current.hasAttribute('aria-describedby')
        || current.getAttribute('data-virtualized') !== null
        || (current.tagName === 'DIV' &&
            current.children.length > 3 &&
            current.querySelector('[role="button"]') &&
            current.querySelector('span[dir]'))
      ) {
        return current;
      }
      current = current.parentElement;
      depth++;
    }
    return null;
  }

  async function createPlaceholder(messageType = 'default') {
    const div = document.createElement("div");
    Object.assign(div.style, {
      backgroundColor: "transparent",
      color: "#666",
      padding: "0.5em",
      borderRadius: "6px",
      margin: "0.25em 0",
      fontSize: "0.9em",
      fontStyle: "italic"
    });
    const msg = config.replacementMessages[messageType] || config.replacementMessages.default;
    div.textContent = msg;
    div.setAttribute('data-filtered-content', messageType);
    return div;
  }

  async function replacePostContent(triggerEl, triggerType) {
    const post = findPostContainer(triggerEl);
    if (!post) {
      logDebug("No suitable container found for replacement");
      return false;
    }
    if (runtime.processedContainers.has(post)) {
      logDebug("Post container already replaced, skipping");
      return false;
    }
    runtime.processedContainers.add(post);

    const placeholder = await createPlaceholder(triggerType);
    post.replaceWith(placeholder);
    logDebug(`Replaced post content for type: ${triggerType}`, post);
    return true;
  }

  async function replaceClosestPlainDiv(el) {
    let node = el.parentElement;
    while (node && !(node.tagName === "DIV" && node.attributes.length === 0)) {
      node = node.parentElement;
    }
    if (!node) {
      logDebug("No plain <div> ancestor found for replacement", el);
      return false;
    }
    const placeholder = await createPlaceholder('follow');
    node.replaceWith(placeholder);
    logDebug("Replaced closest plain <div> for follow span", node);
    return true;
  }

  function collectFollowSpans() {
    return Array.from(document.querySelectorAll("span"))
      .filter(s => config.matchTexts.some(t => s.textContent?.trim().startsWith(t)))
      .filter(s => !runtime.seen.has(s));
  }

  function collectReactionElements() {
    return config.reactionLabels.flatMap(label =>
      Array.from(document.querySelectorAll(`[aria-label^="${label}"]`))
    ).filter(el => !runtime.seen.has(el));
  }

  async function replaceMatchingContent() {
    if (runtime.isBusy) return;
    runtime.isBusy = true;

    try {
      const followSpans = collectFollowSpans();
      const reactionEls = collectReactionElements();

      logDebug("Found follow spans:", followSpans.length);
      logDebug("Found reaction elements:", reactionEls.length);

      for (const span of followSpans) {
        runtime.seen.add(span);
        await replaceClosestPlainDiv(span);
      }

      for (const reaction of reactionEls) {
        runtime.seen.add(reaction);
        await replacePostContent(reaction, 'reaction');
      }
    } catch (e) {
      console.error("[FilterOut] Error during replacement:", e);
    } finally {
      runtime.isBusy = false;
    }
  }

  const throttleReplace = () => {
    if (runtime.throttleId) clearTimeout(runtime.throttleId);
    runtime.throttleId = setTimeout(() => {
      requestAnimationFrame(replaceMatchingContent);
    }, config.throttleMs);
  };

  const shouldProcessNode = (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;

    const spans = node.querySelectorAll?.("span") ?? [];
    const hasFollow = [...spans].some(span =>
      config.matchTexts.some(text =>
        span.textContent?.trim().startsWith(text)
      )
    );

    const hasReaction = config.reactionLabels.some(label =>
      node.querySelector(`[aria-label^="${label}"]`)
    );

    return hasFollow || hasReaction;
  };

  function observeDomMutations() {
    runtime.observer = new MutationObserver(mutations => {
      for (const { addedNodes } of mutations) {
        if ([...addedNodes].some(shouldProcessNode)) {
          logDebug("DOM mutation detected, triggering replacement");
          throttleReplace();
          break;
        }
      }
    });

    runtime.observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    logDebug("DOM observer initialized");
  }

  function initialize() {
    setTimeout(() => {
      replaceMatchingContent();
      observeDomMutations();
    }, config.initDelayMs);
  }

  function cleanup() {
    runtime.observer?.disconnect();
    if (runtime.throttleId) clearTimeout(runtime.throttleId);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }

  window.addEventListener("beforeunload", cleanup);

})();
