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
    USE_ADVICE_API: false, // Feature flag for advice API (disabled for full CCNA coverage)
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

  const getCCNAFact = () => {
    // Comprehensive CCNA exam coverage - all essential topics for passing
    const ccnaFacts = [
      // === NETWORK FUNDAMENTALS ===
      "OSI Model: Physical, Data Link, Network, Transport, Session, Presentation, Application",
      "TCP/IP Model: Network Access, Internet, Transport, Application",
      "Ethernet frame: Preamble(7) + SFD(1) + Dest MAC(6) + Src MAC(6) + Type(2) + Data(46-1500) + FCS(4)",
      "MAC address: 48-bit, first 24 bits = OUI (Organizationally Unique Identifier)",
      "IPv4 header: Version(4) + IHL(4) + ToS(8) + Total Length(16) + ID(16) + Flags(3) + Fragment Offset(13) + TTL(8) + Protocol(8) + Header Checksum(16) + Source IP(32) + Dest IP(32)",
      "TCP header: Source Port(16) + Dest Port(16) + Sequence(32) + Acknowledgment(32) + Header Length(4) + Flags(6) + Window(16) + Checksum(16) + Urgent(16)",
      "UDP header: Source Port(16) + Dest Port(16) + Length(16) + Checksum(16)",
      
      // === BINARY AND SUBNETTING ===
      "Powers of 2: 2⁰=1, 2¹=2, 2²=4, 2³=8, 2⁴=16, 2⁵=32, 2⁶=64, 2⁷=128, 2⁸=256",
      "Binary positions: 128 64 32 16 8 4 2 1 (for 8-bit octet)",
      "Subnet masks: /8=255.0.0.0, /16=255.255.0.0, /24=255.255.255.0",
      "VLSM: /25=128 hosts, /26=64 hosts, /27=32 hosts, /28=16 hosts, /29=8 hosts, /30=4 hosts",
      "Magic numbers: /25=128, /26=64, /27=32, /28=16, /29=8, /30=4, /31=2, /32=1",
      "Wildcard masks: Inverse of subnet mask. 255.255.255.0 = 0.0.0.255 wildcard",
      "IPv4 classes: A(1-126/8), B(128-191/16), C(192-223/24), D(224-239 multicast), E(240-255 experimental)",
      "Private addresses: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16",
      "Special addresses: 127.0.0.0/8 (loopback), 169.254.0.0/16 (APIPA), 224.0.0.0/4 (multicast)",
      
      // === PORT NUMBERS ===
      "Well-known ports: FTP(20,21), SSH(22), Telnet(23), SMTP(25), DNS(53), DHCP(67,68), TFTP(69), HTTP(80), POP3(110), SNMP(161,162), HTTPS(443)",
      "TCP ports: FTP(21), SSH(22), Telnet(23), SMTP(25), HTTP(80), HTTPS(443)",
      "UDP ports: DNS(53), DHCP(67,68), TFTP(69), SNMP(161,162), RIP(520)",
      
      // === SWITCHING ===
      "STP: Root bridge has lowest Bridge ID (Priority + MAC), default priority = 32768",
      "STP states: Disabled → Blocking → Listening → Learning → Forwarding",
      "STP timers: Hello(2s), Forward Delay(15s), Max Age(20s)",
      "STP port types: Root port, Designated port, Alternate port, Backup port",
      "RSTP (802.1w): Discarding → Learning → Forwarding (faster convergence)",
      "VLAN ranges: 1-1005 (normal range), 1006-4094 (extended range)",
      "VLAN 1: Default VLAN, cannot be deleted, carries control traffic",
      "VLANs 1002-1005: Reserved for legacy (FDDI, Token Ring)",
      "Trunking: 802.1Q (industry standard), ISL (Cisco proprietary, deprecated)",
      "DTP modes: Auto, Desirable, On, Nonegotiate",
      "VTP modes: Server, Client, Transparent, Off",
      "EtherChannel: PAgP (Cisco) - Auto/Desirable, LACP (802.3ad) - Active/Passive",
      "Switch port security: Sticky MAC, violation modes (protect, restrict, shutdown)",
      
      // === ROUTING PROTOCOLS ===
      "RIPv1: Classful, broadcast, no authentication, 15 hop limit",
      "RIPv2: Classless, multicast 224.0.0.9, MD5 auth, 15 hop limit, 30s updates",
      "EIGRP: Hybrid, multicast 224.0.0.10, unequal load balancing, DUAL algorithm",
      "EIGRP metric: (K1×BW + K2×BW/(256-Load) + K3×Delay) × K5/(Reliability+K4)",
      "EIGRP K-values: K1=1(BW), K2=0(Load), K3=1(Delay), K4=0(Reliability), K5=0(MTU)",
      "EIGRP tables: Neighbor table, Topology table, Routing table",
      "OSPF: Link-state, multicast 224.0.0.5 (all routers), 224.0.0.6 (DR/BDR)",
      "OSPF areas: Area 0 (backbone), stub areas, totally stubby areas, NSSA",
      "OSPF LSA types: Type 1 (Router), Type 2 (Network), Type 3 (Summary), Type 4 (ASBR Summary), Type 5 (External)",
      "OSPF timers: Hello 10s (broadcast), 30s (NBMA), Dead 40s (broadcast), 120s (NBMA)",
      "OSPF network types: Broadcast, Point-to-point, NBMA, Point-to-multipoint",
      "OSPF DR/BDR election: Highest priority (default 1), then highest Router ID",
      "Administrative distances: Connected(0), Static(1), EIGRP(90), OSPF(110), RIP(120)",
      
      // === ACCESS CONTROL LISTS ===
      "Standard ACLs: 1-99, 1300-1999, filter by source IP only",
      "Extended ACLs: 100-199, 2000-2699, filter by source/dest IP, port, protocol",
      "ACL processing: Top-down, first match wins, implicit deny at end",
      "Wildcard masks: 0=must match exactly, 255=ignore completely",
      "ACL placement: Standard close to destination, Extended close to source",
      
      // === NETWORK SERVICES ===
      "DHCP DORA: Discover → Offer → Request → Acknowledge",
      "DHCP lease process: 50% lease time (renew), 87.5% lease time (rebind)",
      "DNS: UDP 53 (queries), TCP 53 (zone transfers)",
      "DNS record types: A (IPv4), AAAA (IPv6), CNAME (alias), MX (mail), NS (nameserver), PTR (reverse)",
      "NTP: UDP 123, hierarchical time distribution, stratum levels 0-15",
      "SNMP: v1/v2c (community strings), v3 (encryption), UDP 161 (agent), 162 (manager)",
      "Syslog severity levels: 0(Emergency), 1(Alert), 2(Critical), 3(Error), 4(Warning), 5(Notice), 6(Info), 7(Debug)",
      
      // === NAT ===
      "NAT types: Static (1:1), Dynamic (pool), PAT/Overload (many:1)",
      "NAT terminology: Inside local, Inside global, Outside local, Outside global",
      "NAT table: Maps inside local to inside global addresses",
      
      // === IPv6 ===
      "IPv6: 128-bit addresses, 8 groups of 4 hex digits, separated by colons",
      "IPv6 shortening: Remove leading zeros, :: for consecutive zero groups (once per address)",
      "IPv6 address types: Unicast, Multicast, Anycast (no broadcast)",
      "IPv6 unicast: Global (2000::/3), Link-local (fe80::/10), Unique local (fc00::/7)",
      "IPv6 multicast: ff00::/8, ff02::1 (all nodes), ff02::2 (all routers)",
      "IPv6 loopback: ::1/128",
      "IPv6 EUI-64: Insert FFFE in middle of MAC, flip 7th bit",
      "IPv6 neighbor discovery: RS, RA, NS, NA, redirect messages",
      
      // === WIRELESS ===
      "802.11 standards: a(5GHz/54Mbps), b(2.4GHz/11Mbps), g(2.4GHz/54Mbps), n(2.4/5GHz/600Mbps), ac(5GHz/1.3Gbps)",
      "Wireless security: WEP (broken), WPA (TKIP/RC4), WPA2 (AES/CCMP), WPA3 (SAE)",
      "Wireless modes: Infrastructure (AP), Ad-hoc (IBSS), Monitor",
      "CSMA/CA: Carrier Sense Multiple Access with Collision Avoidance",
      "2.4GHz channels: 11 channels (US), channels 1, 6, 11 non-overlapping",
      "5GHz: More channels, less congested, shorter range",
      
      // === WAN TECHNOLOGIES ===
      "PPP: Point-to-Point Protocol, authentication (PAP, CHAP), multilink",
      "PAP: Password Authentication Protocol, plaintext passwords",
      "CHAP: Challenge Handshake Authentication Protocol, encrypted",
      "Frame Relay: DLCI (Data Link Connection Identifier), CIR (Committed Information Rate)",
      "Frame Relay LMI: Local Management Interface, status messages",
      "MPLS: Multiprotocol Label Switching, label-switched paths",
      
      // === NETWORK DESIGN ===
      "Three-tier model: Core, Distribution, Access layers",
      "Two-tier model: Collapsed core (Core/Distribution combined)",
      "Spine-leaf topology: Every leaf connects to every spine",
      "Network redundancy: Multiple paths, load balancing, failover",
      
      // === FIRST HOP REDUNDANCY ===
      "HSRP: Hot Standby Router Protocol (Cisco), priority 0-255 (default 100)",
      "HSRP states: Initial, Learn, Listen, Speak, Standby, Active",
      "HSRP virtual MAC: 0000.0c07.acXX (XX = group number)",
      "VRRP: Virtual Router Redundancy Protocol (RFC 5798), priority 1-254",
      "GLBP: Gateway Load Balancing Protocol (Cisco), load balancing",
      
      // === SECURITY FUNDAMENTALS ===
      "Security triad: Confidentiality, Integrity, Availability (CIA)",
      "Authentication factors: Something you know, have, are",
      "AAA: Authentication, Authorization, Accounting",
      "RADIUS: Remote Authentication Dial-In User Service, UDP 1812/1813",
      "TACACS+: Terminal Access Controller Access-Control System Plus, TCP 49",
      "Port security: Restrict MAC addresses per port, violation actions",
      "802.1X: Port-based authentication, supplicant/authenticator/authentication server",
      
      // === QUALITY OF SERVICE ===
      "QoS models: Best effort, IntServ, DiffServ",
      "Traffic types: Voice (delay-sensitive), Video (bandwidth-intensive), Data (loss-sensitive)",
      "QoS mechanisms: Classification, Marking, Policing, Shaping, Queuing",
      "DSCP: Differentiated Services Code Point, IP ToS field",
      "CoS: Class of Service, 802.1Q frame tag",
      
      // === TROUBLESHOOTING ===
      "OSI troubleshooting: Bottom-up, Top-down, Divide-and-conquer",
      "Physical layer: Cables, connectors, power, link lights",
      "Data link: MAC addresses, switching, VLANs, trunking",
      "Network layer: IP addresses, routing, ARP",
      "Transport layer: TCP/UDP ports, connections",
      "ping: ICMP echo request/reply, tests Layer 3 connectivity",
      "traceroute: Shows path to destination, hop-by-hop",
      "ARP table: Maps IP addresses to MAC addresses",
      "show commands: show ip route, show interfaces, show vlan, show spanning-tree",
      
      // === NETWORK AUTOMATION ===
      "SDN: Software-Defined Networking, centralized control plane",
      "APIs: REST (HTTP), SOAP (XML), GraphQL",
      "JSON: JavaScript Object Notation, lightweight data format",
      "YAML: YAML Ain't Markup Language, human-readable serialization",
      "Python: Popular network automation language",
      "Ansible: Agentless automation platform",
      "Configuration management: Version control, templates, consistency",
      
      // === CLOUD CONCEPTS ===
      "Cloud models: Public, Private, Hybrid, Community",
      "Service models: IaaS, PaaS, SaaS",
      "Virtualization: Hypervisor Type 1 (bare metal), Type 2 (hosted)",
      "Containers: Docker, Kubernetes, microservices",
      "VPC: Virtual Private Cloud, isolated cloud resources"
    ];
    
    return `💡 ${ccnaFacts[Math.floor(Math.random() * ccnaFacts.length)]}`;
  };

  const createReplacementDiv = () => {
    const subtleMessageDiv = document.createElement("div");
    subtleMessageDiv.style.backgroundColor = "transparent";
    subtleMessageDiv.style.color = "#666";
    subtleMessageDiv.style.padding = "0.5em";
    subtleMessageDiv.style.borderRadius = "6px";
    subtleMessageDiv.style.margin = "0.25em 0";
    subtleMessageDiv.style.fontSize = "0.9em";
    subtleMessageDiv.style.fontStyle = "italic";

    if (CONFIG.USE_ADVICE_API) {
      // This path is disabled - API removed for full CCNA coverage
      subtleMessageDiv.textContent = "Ukryto sugerowaną treść.";
    } else {
      subtleMessageDiv.textContent = getCCNAFact();
    }

    return subtleMessageDiv;
  };

  const removeMatchingContent = () => {
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
          const replacementDiv = createReplacementDiv();
          targetElement.replaceWith(replacementDiv);
          logDebug("Replaced div with CCNA study material", replacementDiv);
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
