    (function () {
      "use strict";

      var COLORS = {
        blue: "#7f9fe3",
        blueDark: "#5574b8",
        orange: "#e9a078",
        orangeDark: "#b96f49",
        green: "#63b887",
        greenDark: "#39845b",
        cyan: "#70b6c5",
        cyanDark: "#4f91a0",
        dark: "#465268",
        muted: "#68768d",
        line: "#dce3ef"
      };

      var modeMeta = {
        single: {
          level: "Level 1",
          title: "Geradlinig gleichförmig · ein Objekt",
          controls: "Ein Objekt bewegt sich mit konstanter Geschwindigkeit.",
          formula: "x(t) = x₀ + v · t"
        },
        encounter: {
          level: "Level 2",
          title: "Geradlinig gleichförmig · zwei Objekte",
          controls: "Vergleiche zwei konstante Geschwindigkeiten und finde eine mögliche Begegnung.",
          formula: "xA,B(t) = xA,B₀ + vA,B · t"
        },
        accelerated: {
          level: "Level 3",
          title: "Gleichmässig beschleunigt",
          controls: "Die Geschwindigkeit ändert sich in jeder Sekunde um denselben Betrag.",
          formula: "x(t) = x₀ + v₀t + ½at²"
        }
      };

      var profiles = {
        single: { x0: 0, v: 7, tMax: 12 },
        encounter: { xA0: 0, vA: 7, xB0: 90, vB: -5, tMax: 12 },
        accelerated: { x0: 0, v0: 0, a: 1.5, tMax: 12 }
      };

      var presets = {
        single: [
          { id: "forward", label: "Vorwärts", values: { x0: 0, v: 7, tMax: 12 } },
          { id: "backward", label: "Rückwärts", values: { x0: 0, v: -6, tMax: 12 } },
          { id: "rest", label: "Stillstand", values: { x0: 0, v: 0, tMax: 12 } }
        ],
        encounter: [
          { id: "headon", label: "Aufeinander zu", values: { xA0: 0, vA: 7, xB0: 90, vB: -5, tMax: 12 } },
          { id: "catchup", label: "Einholen", values: { xA0: 0, vA: 10, xB0: 40, vB: 4, tMax: 12 } },
          { id: "parallel", label: "Parallel", values: { xA0: 0, vA: 6, xB0: 45, vB: 6, tMax: 12 } }
        ],
        accelerated: [
          { id: "start", label: "Anfahren", values: { x0: 0, v0: 0, a: 1.5, tMax: 12 } },
          { id: "brake", label: "Bremsen", values: { x0: 0, v0: 16, a: -2, tMax: 8 } },
          { id: "turn", label: "Richtungswechsel", values: { x0: 0, v0: -9, a: 1.5, tMax: 12 } }
        ]
      };

      var definitions = {
        single: {
          main: [
            { key: "x0", label: "Anfangsort x₀", help: "Ort bei t = 0", unit: "m", min: -20, max: 100, step: 1 },
            { key: "v", label: "Geschwindigkeit v", help: "konstant", unit: "m/s", min: -12, max: 18, step: 0.5 }
          ],
          time: { key: "tMax", label: "Beobachtungszeit", help: "Länge der Simulation", unit: "s", min: 4, max: 20, step: 1 }
        },
        encounter: {
          a: [
            { key: "xA0", label: "Anfangsort xA₀", help: "Objekt A bei t = 0", unit: "m", min: -20, max: 100, step: 1 },
            { key: "vA", label: "Geschwindigkeit vA", help: "konstant", unit: "m/s", min: -12, max: 18, step: 0.5 }
          ],
          b: [
            { key: "xB0", label: "Anfangsort xB₀", help: "Objekt B bei t = 0", unit: "m", min: -20, max: 120, step: 1 },
            { key: "vB", label: "Geschwindigkeit vB", help: "konstant", unit: "m/s", min: -12, max: 18, step: 0.5 }
          ],
          time: { key: "tMax", label: "Beobachtungszeit", help: "sichtbares Zeitfenster", unit: "s", min: 4, max: 20, step: 1 }
        },
        accelerated: {
          main: [
            { key: "x0", label: "Anfangsort x₀", help: "Ort bei t = 0", unit: "m", min: -20, max: 100, step: 1 },
            { key: "v0", label: "Startgeschwindigkeit v₀", help: "Geschwindigkeit bei t = 0", unit: "m/s", min: -15, max: 20, step: 0.5 },
            { key: "a", label: "Beschleunigung a", help: "Änderung von v pro Sekunde", unit: "m/s²", min: -4, max: 4, step: 0.1 }
          ],
          time: { key: "tMax", label: "Beobachtungszeit", help: "Länge der Simulation", unit: "s", min: 4, max: 20, step: 1 }
        }
      };

      var state = {
        mode: "single",
        time: 0,
        playing: false,
        playback: 1,
        raf: 0,
        lastFrame: 0,
        lastPaint: 0,
        quizType: "understanding",
        analysisHelpers: false,
        meetingRevealed: false
      };

      var quizStates = {
        single: {
          understanding: { index: 0, score: 0, answered: false, selected: -1 },
          calculation: { index: 0, score: 0, answered: false, selected: -1 }
        },
        encounter: {
          understanding: { index: 0, score: 0, answered: false, selected: -1 },
          calculation: { index: 0, score: 0, answered: false, selected: -1 }
        },
        accelerated: {
          understanding: { index: 0, score: 0, answered: false, selected: -1 },
          calculation: { index: 0, score: 0, answered: false, selected: -1 }
        }
      };

      var plotCaches = {};
      var stageDomainCache = null;
      var resizeFrame = 0;
      var comparisonState = {
        single: { measurement: null, axes: {}, timeMax: 0, requiredTimeMax: 0, revision: 0 },
        encounter: { measurement: null, axes: {}, timeMax: 0, requiredTimeMax: 0, revision: 0 },
        accelerated: { measurement: null, axes: {}, timeMax: 0, requiredTimeMax: 0, revision: 0 }
      };

      var els = {
        backLink: document.getElementById("backLink"),
        levelPicker: document.getElementById("levelPicker"),
        controlsTitle: document.getElementById("controlsTitle"),
        controlsIntro: document.getElementById("controlsIntro"),
        controlsBody: document.getElementById("controlsBody"),
        sceneEyebrow: document.getElementById("sceneEyebrow"),
        sceneTitle: document.getElementById("sceneTitle"),
        sceneHint: document.getElementById("sceneHint"),
        formulaBadge: document.getElementById("formulaBadge"),
        motionSvg: document.getElementById("motionSvg"),
        playButton: document.getElementById("playButton"),
        playIcon: document.getElementById("playIcon"),
        playLabel: document.getElementById("playLabel"),
        stepButton: document.getElementById("stepButton"),
        resetButton: document.getElementById("resetButton"),
        timeSlider: document.getElementById("timeSlider"),
        timeOutput: document.getElementById("timeOutput"),
        speedSelect: document.getElementById("speedSelect"),
        metricGrid: document.getElementById("metricGrid"),
        plotsGrid: document.getElementById("plotsGrid"),
        analysisToggle: null,
        comparisonSave: null,
        comparisonDelete: null,
        comparisonSummary: null,
        scaleReset: null,
        positionPlotTitle: document.getElementById("positionPlotTitle"),
        positionPlotSvg: document.getElementById("positionPlotSvg"),
        positionPlotSummary: document.getElementById("positionPlotSummary"),
        positionPlotLegend: document.getElementById("positionPlotLegend"),
        velocityPlotTitle: document.getElementById("velocityPlotTitle"),
        velocityPlotSvg: document.getElementById("velocityPlotSvg"),
        velocityPlotSummary: document.getElementById("velocityPlotSummary"),
        velocityPlotLegend: document.getElementById("velocityPlotLegend"),
        extraPlotCard: document.getElementById("extraPlotCard"),
        extraPlotTitle: document.getElementById("extraPlotTitle"),
        extraPlotSvg: document.getElementById("extraPlotSvg"),
        extraPlotSummary: document.getElementById("extraPlotSummary"),
        extraPlotLegend: document.getElementById("extraPlotLegend"),
        quizLevel: document.getElementById("quizLevel"),
        quizTitle: document.getElementById("quizTitle"),
        quizIntro: document.getElementById("quizIntro"),
        quizTypePicker: document.getElementById("quizTypePicker"),
        quizBody: document.querySelector(".quiz-body"),
        quizScore: document.getElementById("quizScore"),
        quizProgressTrack: document.getElementById("quizProgressTrack"),
        quizProgress: document.getElementById("quizProgress"),
        quizCounter: document.getElementById("quizCounter"),
        quizKind: document.getElementById("quizKind"),
        quizVisual: document.getElementById("quizVisual"),
        quizQuestion: document.getElementById("quizQuestion"),
        quizAnswers: document.getElementById("quizAnswers"),
        quizFeedback: document.getElementById("quizFeedback"),
        nextQuestion: document.getElementById("nextQuestion"),
        simulationStatus: document.getElementById("simulationStatus")
      };

      function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
      }

      function finite(value, fallback) {
        return Number.isFinite(value) ? value : fallback;
      }

      function fmt(value, digits) {
        var safe = Math.abs(value) < 0.0000001 ? 0 : value;
        var places = typeof digits === "number" ? digits : 1;
        return safe.toFixed(places).replace(".", ",");
      }

      function fmtAxis(value) {
        var absolute = Math.abs(value);
        return fmt(value, absolute >= 20 || Math.abs(value - Math.round(value)) < 0.001 ? 0 : 1);
      }

      function signed(value, digits) {
        return (value < 0 ? "− " : "+ ") + fmt(Math.abs(value), digits);
      }

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      function currentProfile() {
        return profiles[state.mode];
      }

      function currentComparisonState() {
        return comparisonState[state.mode];
      }

      function cloneProfile(profile) {
        return Object.assign({}, profile);
      }

      function comparisonSignature() {
        var comparison = currentComparisonState();
        return comparison.revision + "|" + (comparison.measurement ?
          JSON.stringify(comparison.measurement) : "none");
      }

      function motionSignature() {
        return state.mode + "|" + JSON.stringify(currentProfile());
      }

      function plotSignature(plotId) {
        return motionSignature() + "|" + plotId + "|analysis:" + (state.analysisHelpers ? "1" : "0") +
          "|meeting:" + (state.meetingRevealed ? "1" : "0") + "|comparison:" + comparisonSignature();
      }

      function responsivePlotWidth(svg) {
        var rect = svg.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return clamp(rect.width / rect.height * 260, 280, 760);
        }
        return 520;
      }

      function responsiveStageWidth() {
        var rect = els.motionSvg.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return clamp(rect.width / rect.height * 250, 420, 900);
        }
        return 900;
      }

      function setupBackLink() {
        var targets = {
          gymnasium: { href: "../gymi/simulationen/", label: "← Zurück zu Gymnasium-Simulationen" },
          fms: { href: "../fms/simulationen/", label: "← Zurück zu FMS-Simulationen" }
        };
        var params = new URLSearchParams(window.location.search);
        var localAudience = document.body.getAttribute("data-audience");
        var source = localAudience || params.get("from");
        if (!source && document.referrer.indexOf("/physik/gymi/simulationen") !== -1) {
          source = "gymnasium";
        }
        if (!source && document.referrer.indexOf("/physik/fms/simulationen") !== -1) {
          source = "fms";
        }
        if (targets[source]) {
          els.backLink.href = localAudience ? "./" : targets[source].href;
          els.backLink.textContent = targets[source].label;
        }
        var requestedLevel = params.get("level");
        if (requestedLevel === "2") {
          state.mode = "encounter";
        } else if (requestedLevel === "3") {
          state.mode = "accelerated";
        }
      }

      function setupAnalysisControls() {
        var heading = document.querySelector(".plots-heading");
        if (!heading) {
          return;
        }
        var actions = heading.querySelector(".diagram-actions");
        if (!actions) {
          actions = document.createElement("div");
          actions.className = "diagram-actions";
          heading.appendChild(actions);
        }
        actions.setAttribute("role", "group");
        actions.setAttribute("aria-label", "Diagrammwerkzeuge");

        els.analysisToggle = document.getElementById("analysisToggle");
        if (!els.analysisToggle) {
          els.analysisToggle = document.createElement("button");
          els.analysisToggle.id = "analysisToggle";
          els.analysisToggle.className = "analysis-toggle";
          els.analysisToggle.type = "button";
          els.analysisToggle.setAttribute("aria-controls", "plotsGrid");
        }
        actions.insertBefore(els.analysisToggle, actions.firstChild);

        els.comparisonSave = document.getElementById("comparisonSave");
        if (!els.comparisonSave) {
          els.comparisonSave = document.createElement("button");
          els.comparisonSave.id = "comparisonSave";
          els.comparisonSave.className = "comparison-button comparison-save";
          els.comparisonSave.type = "button";
          els.comparisonSave.setAttribute("aria-controls", "plotsGrid");
          els.comparisonSave.setAttribute("aria-describedby", "comparisonSummary");
          actions.appendChild(els.comparisonSave);
        }

        els.comparisonDelete = document.getElementById("comparisonDelete");
        if (!els.comparisonDelete) {
          els.comparisonDelete = document.createElement("button");
          els.comparisonDelete.id = "comparisonDelete";
          els.comparisonDelete.className = "comparison-button comparison-delete";
          els.comparisonDelete.type = "button";
          els.comparisonDelete.setAttribute("aria-controls", "plotsGrid");
          els.comparisonDelete.setAttribute("aria-describedby", "comparisonSummary");
          els.comparisonDelete.textContent = "Vergleich löschen";
          actions.appendChild(els.comparisonDelete);
        }

        els.scaleReset = document.getElementById("scaleReset");
        if (!els.scaleReset) {
          els.scaleReset = document.createElement("button");
          els.scaleReset.id = "scaleReset";
          els.scaleReset.className = "comparison-button scale-reset";
          els.scaleReset.type = "button";
          els.scaleReset.setAttribute("aria-controls", "plotsGrid");
          els.scaleReset.textContent = "Skala anpassen";
          els.scaleReset.title = "Achsen neu an die aktuellen und gespeicherten Kurven anpassen";
          els.scaleReset.hidden = true;
          actions.appendChild(els.scaleReset);
        }

        els.comparisonSummary = document.getElementById("comparisonSummary");
        if (!els.comparisonSummary) {
          els.comparisonSummary = document.createElement("span");
          els.comparisonSummary.id = "comparisonSummary";
          els.comparisonSummary.className = "comparison-summary";
          actions.appendChild(els.comparisonSummary);
        }

        updateAnalysisToggle();
        updateComparisonControls();
      }

      function updateAnalysisToggle() {
        if (!els.analysisToggle) {
          return;
        }
        els.analysisToggle.setAttribute("aria-pressed", state.analysisHelpers ? "true" : "false");
        els.analysisToggle.setAttribute(
          "aria-label",
          state.analysisHelpers ? "Analysehilfen ausblenden" : "Analysehilfen einblenden"
        );
        els.analysisToggle.textContent = state.analysisHelpers ?
          "Analysehilfen: Ein" : "Analysehilfen: Aus";
      }

      function toggleAnalysisHelpers() {
        state.analysisHelpers = !state.analysisHelpers;
        plotCaches = {};
        updateAnalysisToggle();
        renderDynamic();
        els.simulationStatus.textContent = state.analysisHelpers ?
          "Analysehilfen eingeblendet." : "Analysehilfen ausgeblendet.";
      }

      function updateComparisonControls() {
        if (!els.comparisonSave || !els.comparisonDelete || !els.comparisonSummary) {
          return;
        }
        var hasMeasurement = Boolean(currentComparisonState().measurement);
        var canSave = state.time > 0.0001;
        els.comparisonSave.disabled = !canSave;
        els.comparisonSave.textContent = hasMeasurement ? "Vergleich aktualisieren" : "Als Vergleich merken";
        els.comparisonSave.title = canSave ?
          "Die aktuell sichtbaren Kurven als Vergleich speichern" :
          "Lassen Sie die Simulation zuerst ein Stück laufen";
        els.comparisonDelete.hidden = !hasMeasurement;
        els.comparisonSummary.classList.toggle("sr-only", !hasMeasurement);
        if (hasMeasurement) {
          els.comparisonSummary.textContent = comparisonDescription(currentComparisonState().measurement);
        } else if (canSave) {
          els.comparisonSummary.textContent = "Die sichtbaren Kurven können jetzt als Vergleich gespeichert werden.";
        } else {
          els.comparisonSummary.textContent = "Für einen Vergleich die Simulation zuerst ein Stück laufen lassen.";
        }
        if (els.scaleReset) {
          els.scaleReset.hidden = !scaleNeedsRefit();
        }
      }

      function comparisonDescription(measurement) {
        if (!measurement) {
          return "Kein Vergleich gespeichert.";
        }
        var profile = measurement.profile;
        var end = "bis t = " + fmt(measurement.visibleUntil) + " s";
        if (state.mode === "single") {
          return "Vergleich: x₀ = " + fmt(profile.x0) + " m · v = " + fmt(profile.v) + " m/s · " + end;
        }
        if (state.mode === "encounter") {
          return "Vergleich: A (" + fmt(profile.xA0) + " m; " + fmt(profile.vA) + " m/s) · B (" +
            fmt(profile.xB0) + " m; " + fmt(profile.vB) + " m/s) · " + end;
        }
        return "Vergleich: x₀ = " + fmt(profile.x0) + " m · v₀ = " + fmt(profile.v0) +
          " m/s · a = " + fmt(profile.a) + " m/s² · " + end;
      }

      function invalidateComparisonRender(mode) {
        var comparison = comparisonState[mode];
        comparison.revision += 1;
        plotCaches = {};
        stageDomainCache = null;
      }

      function resetComparisonView(mode) {
        var comparison = comparisonState[mode];
        comparison.axes = {};
        comparison.timeMax = 0;
        comparison.requiredTimeMax = 0;
        invalidateComparisonRender(mode);
      }

      function scaleNeedsRefit() {
        var comparison = currentComparisonState();
        if (comparison.timeMax > comparison.requiredTimeMax + 0.000001) {
          return true;
        }
        return Object.keys(comparison.axes).some(function (key) {
          return Boolean(comparison.axes[key].needsRefit);
        });
      }

      function resetCurrentScale() {
        resetComparisonView(state.mode);
        renderDynamic();
        els.simulationStatus.textContent = "Skala für " + modeMeta[state.mode].level + " neu angepasst.";
      }

      function saveComparisonMeasurement() {
        if (state.time <= 0.0001) {
          return;
        }
        pauseSimulation();
        var comparison = currentComparisonState();
        comparison.measurement = {
          profile: cloneProfile(currentProfile()),
          visibleUntil: clamp(state.time, 0, currentProfile().tMax)
        };
        invalidateComparisonRender(state.mode);
        renderDynamic();
        els.simulationStatus.textContent = "Vergleich für " + modeMeta[state.mode].level +
          " bis t = " + fmt(comparison.measurement.visibleUntil) + " s gespeichert.";
      }

      function deleteComparisonMeasurement() {
        var comparison = currentComparisonState();
        if (!comparison.measurement) {
          return;
        }
        comparison.measurement = null;
        invalidateComparisonRender(state.mode);
        renderDynamic();
        els.simulationStatus.textContent = "Vergleich für " + modeMeta[state.mode].level + " gelöscht.";
        els.comparisonSave.focus();
      }

      function allDefinitionsForMode(mode) {
        var config = definitions[mode];
        var result = [];
        Object.keys(config).forEach(function (key) {
          if (Array.isArray(config[key])) {
            result = result.concat(config[key]);
          } else {
            result.push(config[key]);
          }
        });
        return result;
      }

      function definitionFor(key) {
        var list = allDefinitionsForMode(state.mode);
        for (var i = 0; i < list.length; i += 1) {
          if (list[i].key === key) {
            return list[i];
          }
        }
        return null;
      }

      function controlMarkup(definition) {
        var value = currentProfile()[definition.key];
        var idBase = state.mode + "-" + definition.key;
        return [
          "<div class='control'>",
            "<div class='control-top'>",
              "<label class='control-label' for='", idBase, "-number'>",
                escapeHtml(definition.label),
                "<small>", escapeHtml(definition.help), "</small>",
              "</label>",
              "<span class='number-wrap'>",
                "<input id='", idBase, "-number' type='number' inputmode='decimal'",
                  " min='", definition.min, "' max='", definition.max, "' step='", definition.step, "'",
                  " value='", value, "' data-value-key='", definition.key, "' />",
                "<span>", escapeHtml(definition.unit), "</span>",
              "</span>",
            "</div>",
            "<input id='", idBase, "-range' type='range'",
              " min='", definition.min, "' max='", definition.max, "' step='", definition.step, "'",
              " value='", value, "' data-value-key='", definition.key, "'",
              " aria-label='", escapeHtml(definition.label), "' />",
          "</div>"
        ].join("");
      }

      function presetMarkup() {
        var activePresets = presets[state.mode];
        var profile = currentProfile();
        var html = "<span class='preset-label'>Beispiele</span><div class='preset-row'>";
        activePresets.forEach(function (preset) {
          var active = Object.keys(preset.values).every(function (key) {
            return Math.abs(profile[key] - preset.values[key]) < 0.0001;
          });
          html += "<button class='preset-button" + (active ? " active" : "") + "' type='button' data-preset='" +
            preset.id + "'>" + escapeHtml(preset.label) + "</button>";
        });
        return html + "</div>";
      }

      function renderControls() {
        var html = presetMarkup();
        if (state.mode === "encounter") {
          html += "<div class='object-card object-a'><div class='object-card-title'><span>Objekt A</span><span class='object-chip a'>A</span></div>";
          definitions.encounter.a.forEach(function (definition) {
            html += controlMarkup(definition);
          });
          html += "</div>";
          html += "<div class='object-card object-b'><div class='object-card-title'><span>Objekt B</span><span class='object-chip b'>B</span></div>";
          definitions.encounter.b.forEach(function (definition) {
            html += controlMarkup(definition);
          });
          html += "</div>";
          html += "<div class='control-stack'>" + controlMarkup(definitions.encounter.time) + "</div>";
          html += "<div class='meeting-check-wrap'>" +
            "<button class='meeting-check-button' id='meetingToggle' type='button' aria-controls='meetingResult' aria-pressed='false'>Treffpunkt prüfen</button>" +
            "<div class='meeting-result concealed' id='meetingResult' role='status' aria-live='polite'></div>" +
            "</div>";
        } else {
          html += "<div class='control-stack'>";
          definitions[state.mode].main.forEach(function (definition) {
            html += controlMarkup(definition);
          });
          html += controlMarkup(definitions[state.mode].time);
          html += "</div>";
          if (state.mode === "single") {
            html += "<div class='formula-note'><strong>Merkregel</strong>In gleichen Zeitabschnitten werden gleich grosse Ortsänderungen zurückgelegt.</div>";
          } else {
            html += "<div class='formula-note'><strong>Was bedeutet a?</strong>Der Wert a gibt an, um wie viele m/s sich v in jeder Sekunde ändert.</div>";
          }
        }
        els.controlsBody.innerHTML = html;
        updateMeetingResult();
      }

      function parseInputValue(input) {
        if (String(input.value).trim() === "") {
          return NaN;
        }
        var direct = input.valueAsNumber;
        if (Number.isFinite(direct)) {
          return direct;
        }
        return Number(String(input.value).replace(",", "."));
      }

      function snapToDefinition(value, definition) {
        var step = definition.step;
        if (!Number.isFinite(step) || step <= 0) {
          return clamp(value, definition.min, definition.max);
        }
        var snapped = definition.min + Math.round((value - definition.min) / step) * step;
        var stepText = String(step);
        var decimalPlaces = stepText.indexOf(".") === -1 ? 0 : stepText.length - stepText.indexOf(".") - 1;
        return Number(clamp(snapped, definition.min, definition.max).toFixed(decimalPlaces));
      }

      function syncControlInputs(key, value, source) {
        var inputs = els.controlsBody.querySelectorAll("[data-value-key='" + key + "']");
        inputs.forEach(function (input) {
          if (input !== source) {
            input.value = value;
          }
        });
      }

      function freshQuizState() {
        return { index: 0, score: 0, answered: false, selected: -1 };
      }

      function resetQuiz(mode, type) {
        if (type) {
          quizStates[mode][type] = freshQuizState();
          return;
        }
        quizStates[mode].understanding = freshQuizState();
        quizStates[mode].calculation = freshQuizState();
      }

      function applyControlInput(input, finalChange) {
        var key = input.getAttribute("data-value-key");
        var definition = definitionFor(key);
        if (!definition) {
          return;
        }
        var value = parseInputValue(input);
        if (!Number.isFinite(value)) {
          if (finalChange) {
            input.value = currentProfile()[key];
          }
          return;
        }
        value = clamp(value, definition.min, definition.max);
        if (finalChange || input.type === "range") {
          value = snapToDefinition(value, definition);
          input.value = value;
        }
        if (Math.abs(currentProfile()[key] - value) < 0.000001) {
          syncControlInputs(key, value, input);
          return;
        }
        currentProfile()[key] = value;
        syncControlInputs(key, value, input);
        pauseSimulation();
        state.time = 0;
        if (state.mode === "encounter") {
          state.meetingRevealed = false;
        }
        resetQuiz(state.mode, "calculation");
        updateMeetingResult();
        renderDynamic();
        renderQuiz();
        updatePresetStates();
      }

      function updatePresetStates() {
        var profile = currentProfile();
        els.controlsBody.querySelectorAll("[data-preset]").forEach(function (button) {
          var preset = presets[state.mode].find(function (item) {
            return item.id === button.getAttribute("data-preset");
          });
          var active = preset && Object.keys(preset.values).every(function (key) {
            return Math.abs(profile[key] - preset.values[key]) < 0.0001;
          });
          button.classList.toggle("active", Boolean(active));
        });
      }

      function applyPreset(id) {
        var preset = presets[state.mode].find(function (item) {
          return item.id === id;
        });
        if (!preset) {
          return;
        }
        if (state.mode === "encounter") {
          state.meetingRevealed = false;
        }
        Object.keys(preset.values).forEach(function (key) {
          currentProfile()[key] = preset.values[key];
        });
        pauseSimulation();
        state.time = 0;
        resetQuiz(state.mode, "calculation");
        renderControls();
        renderDynamic();
        renderQuiz();
        var restoredPreset = els.controlsBody.querySelector("[data-preset='" + id + "']");
        if (restoredPreset) {
          restoredPreset.focus();
        }
      }

      function selectMode(mode) {
        if (!modeMeta[mode]) {
          return;
        }
        pauseSimulation();
        state.mode = mode;
        state.time = 0;
        state.meetingRevealed = false;
        document.querySelectorAll(".level-button").forEach(function (button) {
          var active = button.getAttribute("data-mode") === mode;
          button.setAttribute("aria-checked", active ? "true" : "false");
          button.tabIndex = active ? 0 : -1;
        });
        var params = new URLSearchParams(window.location.search);
        params.set("level", mode === "single" ? "1" : mode === "encounter" ? "2" : "3");
        var nextUrl = window.location.pathname + "?" + params.toString() + window.location.hash;
        try {
          window.history.replaceState(null, "", nextUrl);
        } catch (error) {
          /* Lokale file:-Vorschauen dürfen die URL je nach Browser nicht ändern. */
        }
        renderMode();
      }

      function revealActiveLevel() {
        if (!window.matchMedia("(max-width: 820px)").matches) {
          return;
        }
        var active = els.levelPicker.querySelector("[aria-checked='true']");
        if (!active) {
          return;
        }
        var target = active.offsetLeft - (els.levelPicker.clientWidth - active.offsetWidth) / 2;
        els.levelPicker.scrollLeft = Math.max(0, target);
      }

      function renderMode() {
        var meta = modeMeta[state.mode];
        els.controlsTitle.textContent = state.mode === "encounter" ? "Zwei Bewegungen festlegen" : "Bewegung festlegen";
        els.controlsIntro.textContent = meta.controls;
        els.sceneEyebrow.textContent = meta.level;
        els.sceneTitle.textContent = meta.title;
        els.formulaBadge.textContent = meta.formula;
        els.quizLevel.textContent = meta.level;
        renderControls();
        configurePlotCards();
        renderDynamic();
        renderQuiz();
        revealActiveLevel();
        updateComparisonControls();
      }

      function positionFor(mode, profile, objectId, time) {
        if (mode === "single") {
          return profile.x0 + profile.v * time;
        }
        if (mode === "encounter") {
          return objectId === "A" ?
            profile.xA0 + profile.vA * time : profile.xB0 + profile.vB * time;
        }
        return profile.x0 + profile.v0 * time + 0.5 * profile.a * time * time;
      }

      function velocityFor(mode, profile, objectId, time) {
        if (mode === "single") {
          return profile.v;
        }
        if (mode === "encounter") {
          return objectId === "A" ? profile.vA : profile.vB;
        }
        return profile.v0 + profile.a * time;
      }

      function accelerationFor(mode, profile) {
        return mode === "accelerated" ? profile.a : 0;
      }

      function positionAt(objectId, time) {
        return positionFor(state.mode, currentProfile(), objectId, time);
      }

      function velocityAt(objectId, time) {
        return velocityFor(state.mode, currentProfile(), objectId, time);
      }

      function accelerationAt() {
        return accelerationFor(state.mode, currentProfile());
      }

      function objectIds() {
        return state.mode === "encounter" ? ["A", "B"] : ["A"];
      }

      function meetingAnalysis() {
        if (state.mode !== "encounter") {
          return null;
        }
        var p = profiles.encounter;
        var deltaX = p.xB0 - p.xA0;
        var deltaV = p.vA - p.vB;
        var epsilon = 0.000001;
        if (Math.abs(deltaX) < epsilon && Math.abs(deltaV) < epsilon) {
          return { kind: "always", time: 0, position: p.xA0 };
        }
        if (Math.abs(deltaX) < epsilon) {
          return { kind: "start", time: 0, position: p.xA0 };
        }
        if (Math.abs(deltaV) < epsilon) {
          return { kind: "parallel", time: null, position: null };
        }
        var time = deltaX / deltaV;
        var position = p.xA0 + p.vA * time;
        if (time < -epsilon) {
          return { kind: "past", time: time, position: position };
        }
        if (time > p.tMax + epsilon) {
          return { kind: "later", time: time, position: position };
        }
        return { kind: "within", time: Math.max(0, time), position: position };
      }

      function meetingCopy(analysis) {
        if (!analysis) {
          return "";
        }
        if (analysis.kind === "always") {
          return "Beide Objekte sind immer am gleichen Ort.";
        }
        if (analysis.kind === "start") {
          return "Sie starten gemeinsam bei x = " + fmt(analysis.position) + " m.";
        }
        if (analysis.kind === "parallel") {
          return "Gleiche Geschwindigkeit: Der Abstand bleibt konstant.";
        }
        if (analysis.kind === "past") {
          return "Die Geraden schneiden sich nur bei negativer Zeit. Nach t = 0 gibt es kein Treffen.";
        }
        if (analysis.kind === "later") {
          return "Treffen erst bei t = " + fmt(analysis.time, 2) + " s und x = " + fmt(analysis.position) + " m.";
        }
        return "Treffen bei t = " + fmt(analysis.time, 2) + " s und x = " + fmt(analysis.position) + " m.";
      }

      function updateMeetingResult() {
        var result = document.getElementById("meetingResult");
        if (!result || state.mode !== "encounter") {
          return;
        }
        var button = document.getElementById("meetingToggle");
        if (button) {
          button.setAttribute("aria-pressed", state.meetingRevealed ? "true" : "false");
          button.textContent = state.meetingRevealed ? "Ergebnis verdecken" : "Treffpunkt prüfen";
        }
        result.classList.toggle("concealed", !state.meetingRevealed);
        if (!state.meetingRevealed) {
          result.classList.remove("warning");
          result.innerHTML = "<strong>Vorhersagemodus</strong>Schätze zuerst Treffzeit und Treffort. Decke das Ergebnis erst danach auf.";
          return;
        }
        var analysis = meetingAnalysis();
        var successful = analysis.kind === "within" || analysis.kind === "always" || analysis.kind === "start";
        result.classList.toggle("warning", !successful);
        result.innerHTML = "<strong>Begegnungs-Check</strong>" + escapeHtml(meetingCopy(analysis));
      }

      function toggleMeetingResult() {
        if (state.mode !== "encounter") {
          return;
        }
        state.meetingRevealed = !state.meetingRevealed;
        plotCaches = {};
        updateMeetingResult();
        renderDynamic();
        els.simulationStatus.textContent = state.meetingRevealed ?
          "Treffpunkt-Ergebnis eingeblendet." : "Treffpunkt-Ergebnis wieder verdeckt.";
      }

      function meetingMarkerVisible(analysis) {
        if (!analysis) {
          return false;
        }
        if (state.meetingRevealed) {
          return true;
        }
        return analysis.kind === "within" && analysis.time > 0.000001 &&
          state.time + 0.0001 >= analysis.time;
      }

      function niceStep(raw) {
        if (!Number.isFinite(raw) || raw <= 0) {
          return 1;
        }
        var power = Math.pow(10, Math.floor(Math.log10(raw)));
        var fraction = raw / power;
        var niceFraction;
        if (fraction <= 1) {
          niceFraction = 1;
        } else if (fraction <= 2) {
          niceFraction = 2;
        } else if (fraction <= 5) {
          niceFraction = 5;
        } else {
          niceFraction = 10;
        }
        return niceFraction * power;
      }

      function makeDomain(values, includeZero, tickTarget) {
        var safeValues = values.filter(Number.isFinite);
        if (!safeValues.length) {
          safeValues = [0, 1];
        }
        var min = Math.min.apply(null, safeValues);
        var max = Math.max.apply(null, safeValues);
        if (includeZero) {
          min = Math.min(min, 0);
          max = Math.max(max, 0);
        }
        if (Math.abs(max - min) < 0.000001) {
          var basePad = Math.max(1, Math.abs(max) * 0.2);
          min -= basePad;
          max += basePad;
        } else {
          var pad = (max - min) * 0.08;
          min -= pad;
          max += pad;
        }
        var step = niceStep((max - min) / (tickTarget || 5));
        min = Math.floor(min / step) * step;
        max = Math.ceil(max / step) * step;
        if (Math.abs(max - min) < 0.000001) {
          max = min + step;
        }
        var ticks = [];
        for (var value = min, guard = 0; value <= max + step * 0.25 && guard < 20; value += step, guard += 1) {
          ticks.push(Math.abs(value) < 0.0000001 ? 0 : value);
        }
        return { min: min, max: max, ticks: ticks };
      }

      function valueBounds(values, includeZero) {
        var safeValues = values.filter(Number.isFinite);
        if (!safeValues.length) {
          safeValues = [0, 1];
        }
        var min = Math.min.apply(null, safeValues);
        var max = Math.max.apply(null, safeValues);
        if (includeZero) {
          min = Math.min(min, 0);
          max = Math.max(max, 0);
        }
        return { min: min, max: max };
      }

      function retickDomain(domain, tickTarget) {
        var step = niceStep((domain.max - domain.min) / (tickTarget || 5));
        var ticks = [];
        var start = Math.ceil((domain.min - step * 0.000001) / step) * step;
        for (var value = start, guard = 0;
            value <= domain.max + step * 0.25 && guard < 20;
            value += step, guard += 1) {
          ticks.push(Math.abs(value) < 0.0000001 ? 0 : value);
        }
        return { min: domain.min, max: domain.max, ticks: ticks };
      }

      function stableDomain(axisKey, values, includeZero, tickTarget) {
        var comparison = currentComparisonState();
        var candidate = valueBounds(values, includeZero);
        var idealDomain = makeDomain([candidate.min, candidate.max], includeZero, tickTarget);
        var axis = comparison.axes[axisKey];
        if (!axis) {
          axis = {
            rawMin: candidate.min,
            rawMax: candidate.max,
            domain: idealDomain,
            needsRefit: false
          };
          comparison.axes[axisKey] = axis;
          return axis.domain;
        }

        axis.rawMin = Math.min(axis.rawMin, candidate.min);
        axis.rawMax = Math.max(axis.rawMax, candidate.max);
        if (candidate.min < axis.domain.min - 0.000001 || candidate.max > axis.domain.max + 0.000001) {
          axis.domain = makeDomain([axis.rawMin, axis.rawMax], includeZero, tickTarget);
        }
        axis.needsRefit = axis.domain.min < idealDomain.min - 0.000001 ||
          axis.domain.max > idealDomain.max + 0.000001;
        return axis.domain;
      }

      function stableTimeMaximum(requiredMaximum) {
        var comparison = currentComparisonState();
        comparison.requiredTimeMax = Math.max(finite(requiredMaximum, 1), 1);
        comparison.timeMax = Math.max(comparison.timeMax, comparison.requiredTimeMax);
        return comparison.timeMax;
      }

      function sampleTimesFor(maximum, count) {
        var max = Math.max(0, finite(maximum, 0));
        var times = [];
        for (var i = 0; i <= count; i += 1) {
          times.push(max * i / count);
        }
        return times;
      }

      function sampleTimes(count) {
        return sampleTimesFor(currentProfile().tMax, count);
      }

      function specialTimesForProfile(mode, plotId, profile, endTime) {
        var times = [];
        var limit = clamp(endTime, 0, profile.tMax);
        if (mode === "accelerated" && plotId === "position" && Math.abs(profile.a) > 0.000001) {
          var turnTime = -profile.v0 / profile.a;
          if (turnTime > 0.000001 && turnTime < limit - 0.000001) {
            times.push(turnTime);
          }
        }
        if (mode === "encounter" && (plotId === "position" || plotId === "distance")) {
          var relativeVelocity = profile.vA - profile.vB;
          if (Math.abs(relativeVelocity) > 0.000001) {
            var meetingTime = (profile.xB0 - profile.xA0) / relativeVelocity;
            if (meetingTime >= 0 && meetingTime <= limit + 0.000001) {
              times.push(clamp(meetingTime, 0, limit));
            }
          }
        }
        return times;
      }

      function plotTimesForProfile(mode, plotId, profile, endTime, count) {
        var limit = clamp(endTime, 0, profile.tMax);
        var times = sampleTimesFor(limit, count);
        specialTimesForProfile(mode, plotId, profile, limit).forEach(function (time) {
          if (!times.some(function (sample) { return Math.abs(sample - time) < 0.000001; })) {
            times.push(time);
          }
        });
        times.sort(function (a, b) { return a - b; });
        return times;
      }

      function visibleSampleTimes(endTime, count) {
        var end = clamp(endTime, 0, currentProfile().tMax);
        var times = sampleTimes(count).filter(function (time) {
          return time <= end + 0.000001;
        });
        if (!times.length) {
          times.push(0);
        }
        if (Math.abs(times[times.length - 1] - end) > 0.000001) {
          times.push(end);
        }
        return times;
      }

      function visiblePlotTimes(plotId) {
        var times = visibleSampleTimes(state.time, 90);
        var analysis = meetingAnalysis();
        if ((plotId === "position" || plotId === "distance") && analysis &&
            (analysis.kind === "within" || analysis.kind === "start") &&
            analysis.time <= state.time + 0.000001 &&
            !times.some(function (time) { return Math.abs(time - analysis.time) < 0.000001; })) {
          times.push(analysis.time);
          times.sort(function (a, b) { return a - b; });
        }
        return times;
      }

      function positionDomain(tickTarget) {
        var signature = motionSignature() + "|" + tickTarget + "|comparison:" + comparisonSignature();
        if (stageDomainCache && stageDomainCache.signature === signature) {
          return stageDomainCache.domain;
        }
        var values = [];
        var ids = objectIds();
        sampleTimes(80).forEach(function (time) {
          ids.forEach(function (id) {
            values.push(positionAt(id, time));
          });
        });
        var domain = retickDomain(stableDomain("stage-position", values, true, 5), tickTarget);
        stageDomainCache = { signature: signature, domain: domain };
        return domain;
      }

      function mapValue(value, domainMin, domainMax, pixelMin, pixelMax) {
        return pixelMin + (value - domainMin) / (domainMax - domainMin) * (pixelMax - pixelMin);
      }

      function velocityArrow(x, y, value, color, label, stageWidth) {
        if (Math.abs(value) < 0.01) {
          return "<text x='" + x + "' y='" + (y - 38) + "' text-anchor='middle' fill='" + color +
            "' font-size='13' font-weight='850'>" + escapeHtml(label) + " = 0</text>";
        }
        var direction = value > 0 ? 1 : -1;
        var length = clamp(Math.abs(value) * 5, 26, 92);
        var start = x - direction * 4;
        var end = clamp(x + direction * length, 14, stageWidth - 14);
        var tip = direction > 0 ?
          (end + "," + (y - 42) + " " + (end - 10) + "," + (y - 48) + " " + (end - 10) + "," + (y - 36)) :
          (end + "," + (y - 42) + " " + (end + 10) + "," + (y - 48) + " " + (end + 10) + "," + (y - 36));
        return [
          "<line x1='", start, "' y1='", y - 42, "' x2='", end, "' y2='", y - 42,
            "' stroke='", color, "' stroke-width='3' stroke-linecap='round' />",
          "<polygon points='", tip, "' fill='", color, "' />",
          "<text x='", (start + end) / 2, "' y='", y - 51,
            "' text-anchor='middle' fill='", color, "' font-size='12' font-weight='850'>",
            escapeHtml(label), " = ", fmt(value), " m/s</text>"
        ].join("");
      }

      function accelerationArrow(x, y, value, stageWidth) {
        if (state.mode !== "accelerated") {
          return "";
        }
        if (Math.abs(value) < 0.01) {
          return "<text x='" + x + "' y='" + (y + 53) + "' text-anchor='middle' fill='" + COLORS.cyan +
            "' font-size='12' font-weight='850'>a = 0</text>";
        }
        var direction = value > 0 ? 1 : -1;
        var length = clamp(Math.abs(value) * 18, 28, 76);
        var end = clamp(x + direction * length, 14, stageWidth - 14);
        var tip = direction > 0 ?
          (end + "," + (y + 40) + " " + (end - 9) + "," + (y + 35) + " " + (end - 9) + "," + (y + 45)) :
          (end + "," + (y + 40) + " " + (end + 9) + "," + (y + 35) + " " + (end + 9) + "," + (y + 45));
        return [
          "<line x1='", x, "' y1='", y + 40, "' x2='", end, "' y2='", y + 40,
            "' stroke='", COLORS.cyan, "' stroke-width='3' stroke-linecap='round' />",
          "<polygon points='", tip, "' fill='", COLORS.cyan, "' />",
          "<text x='", (x + end) / 2, "' y='", y + 57,
            "' text-anchor='middle' fill='", COLORS.cyan, "' font-size='12' font-weight='850'>a = ",
            fmt(value), " m/s²</text>"
        ].join("");
      }

      function vehicleMarkup(x, y, id, color, velocity, stageWidth) {
        var bodyX = x - 34;
        var bodyY = y - 20;
        return [
          "<g filter='url(#vehicleShadow)'>",
            "<rect x='", bodyX, "' y='", bodyY, "' width='68' height='31' rx='11' fill='", color,
              "' stroke='rgba(70,82,104,0.22)' stroke-width='1.4' />",
            "<path d='M ", bodyX + 14, " ", bodyY, " L ", bodyX + 25, " ", bodyY - 12,
              " L ", bodyX + 49, " ", bodyY - 12, " L ", bodyX + 58, " ", bodyY,
              " Z' fill='", color, "' opacity='0.88' />",
            "<path d='M ", bodyX + 27, " ", bodyY - 9, " L ", bodyX + 47, " ", bodyY - 9,
              " L ", bodyX + 53, " ", bodyY, " L ", bodyX + 22, " ", bodyY,
              " Z' fill='#eef6ff' opacity='0.92' />",
            "<circle cx='", bodyX + 16, "' cy='", bodyY + 31, "' r='7' fill='#566276' />",
            "<circle cx='", bodyX + 53, "' cy='", bodyY + 31, "' r='7' fill='#566276' />",
            "<circle cx='", bodyX + 16, "' cy='", bodyY + 31, "' r='3' fill='#dbe4f1' />",
            "<circle cx='", bodyX + 53, "' cy='", bodyY + 31, "' r='3' fill='#dbe4f1' />",
            "<text x='", x, "' y='", bodyY + 21, "' text-anchor='middle' fill='#fff' font-size='14' font-weight='950'>",
              id, "</text>",
          "</g>",
          velocityArrow(x, y, velocity, id === "B" ? COLORS.orangeDark : COLORS.blueDark, "v" + (state.mode === "encounter" ? id : ""), stageWidth),
          id === "A" ? accelerationArrow(x, y, accelerationAt(), stageWidth) : ""
        ].join("");
      }

      function drawStage() {
        var stageWidth = responsiveStageWidth();
        var tickTarget = stageWidth < 600 ? 4 : 6;
        var domain = positionDomain(tickTarget);
        var xLeft = stageWidth < 600 ? 45 : 70;
        var xRight = stageWidth - xLeft;
        els.motionSvg.setAttribute("viewBox", "0 0 " + stageWidth + " 250");
        var ids = objectIds();
        var positions = {};
        var velocities = {};
        ids.forEach(function (id) {
          positions[id] = positionAt(id, state.time);
          velocities[id] = velocityAt(id, state.time);
        });

        var markup = [
          "<defs>",
            "<linearGradient id='trackGradient' x1='0' x2='1'>",
              "<stop offset='0%' stop-color='#dce4ef' />",
              "<stop offset='50%' stop-color='#f9fbfd' />",
              "<stop offset='100%' stop-color='#dce4ef' />",
            "</linearGradient>",
            "<filter id='vehicleShadow' x='-35%' y='-50%' width='170%' height='220%'>",
              "<feDropShadow dx='0' dy='7' stdDeviation='7' flood-color='#667da8' flood-opacity='0.2' />",
            "</filter>",
          "</defs>",
          "<rect x='", xLeft - 20, "' y='194' width='", xRight - xLeft + 40,
            "' height='18' rx='9' fill='url(#trackGradient)' stroke='#cbd6e5' />",
          "<line x1='", xLeft, "' y1='203' x2='", xRight, "' y2='203' stroke='#8491a4' stroke-width='2' />"
        ].join("");

        domain.ticks.forEach(function (tick) {
          var x = mapValue(tick, domain.min, domain.max, xLeft, xRight);
          markup += "<line x1='" + x + "' y1='196' x2='" + x + "' y2='214' stroke='#8996a8' stroke-width='1.5' />";
          markup += "<text x='" + x + "' y='232' text-anchor='middle' fill='#68768d' font-size='12' font-weight='750'>" +
            fmtAxis(tick) + " m</text>";
        });

        var analysis = meetingAnalysis();
        var showMeetingMarker = meetingMarkerVisible(analysis);
        if (showMeetingMarker && analysis.kind === "always") {
          var stageCenter = stageWidth / 2;
          markup += [
            "<rect x='", stageCenter - 73, "' y='17' width='146' height='27' rx='13.5' fill='#effaf4' stroke='#8bd0a7' />",
            "<text x='", stageCenter, "' y='35' text-anchor='middle' fill='#39845b' font-size='12' font-weight='900'>immer zusammen</text>"
          ].join("");
        } else if (showMeetingMarker && (analysis.kind === "within" || analysis.kind === "start")) {
          var meetingX = mapValue(analysis.position, domain.min, domain.max, xLeft, xRight);
          markup += [
            "<line x1='", meetingX, "' y1='34' x2='", meetingX, "' y2='194' stroke='", COLORS.green,
              "' stroke-width='2' stroke-dasharray='7 7' opacity='0.9' />",
            "<rect x='", meetingX - 57, "' y='17' width='114' height='27' rx='13.5' fill='#effaf4' stroke='#8bd0a7' />",
            "<text x='", meetingX, "' y='35' text-anchor='middle' fill='#39845b' font-size='12' font-weight='900'>Treffpunkt</text>"
          ].join("");
        }

        ids.forEach(function (id, index) {
          var x = mapValue(positions[id], domain.min, domain.max, xLeft, xRight);
          var start = positionAt(id, 0);
          var startX = mapValue(start, domain.min, domain.max, xLeft, xRight);
          var y = state.mode === "encounter" ? (index === 0 ? 115 : 171) : 143;
          var color = id === "B" ? COLORS.orange : COLORS.blue;
          markup += "<line x1='" + startX + "' y1='" + (y + 17) + "' x2='" + x + "' y2='" + (y + 17) +
            "' stroke='" + color + "' stroke-width='5' stroke-linecap='round' opacity='0.22' />";
          markup += "<circle cx='" + startX + "' cy='" + (y + 17) + "' r='5' fill='#fff' stroke='" + color +
            "' stroke-width='2' opacity='0.9' />";
          markup += vehicleMarkup(x, y, id, color, velocities[id], stageWidth);
        });

        els.motionSvg.innerHTML = markup;
        var description = state.mode === "encounter" ?
          "Zwei Objekte A und B auf einer geraden Strecke bei t gleich " + fmt(state.time) + " Sekunden." :
          "Objekt A auf einer geraden Strecke bei t gleich " + fmt(state.time) + " Sekunden.";
        els.motionSvg.setAttribute("aria-label", description);
      }

      function metricMarkup(label, value) {
        return "<div class='metric'><span>" + escapeHtml(label) + "</span><strong>" + escapeHtml(value) + "</strong></div>";
      }

      function renderMetrics() {
        var html = metricMarkup("Zeit t", fmt(state.time) + " s");
        if (state.mode === "encounter") {
          var xA = positionAt("A", state.time);
          var xB = positionAt("B", state.time);
          html += metricMarkup("Ort xA", fmt(xA) + " m");
          html += metricMarkup("Ort xB", fmt(xB) + " m");
          html += metricMarkup("Abstand", fmt(Math.abs(xB - xA)) + " m");
        } else {
          html += metricMarkup("Ort x", fmt(positionAt("A", state.time)) + " m");
          html += metricMarkup("Geschwindigkeit v", fmt(velocityAt("A", state.time)) + " m/s");
          if (state.mode === "accelerated") {
            html += metricMarkup("Beschleunigung a", fmt(accelerationAt()) + " m/s²");
          }
        }
        els.metricGrid.innerHTML = html;
        els.metricGrid.classList.toggle("single-mode", state.mode === "single");
      }

      function updateSceneHint() {
        if (state.mode === "single") {
          els.sceneHint.textContent = "Konstantes v: Die Geschwindigkeit bleibt zu jedem Zeitpunkt gleich.";
        } else if (state.mode === "encounter") {
          els.sceneHint.textContent = state.meetingRevealed ? meetingCopy(meetingAnalysis()) :
            "Vorhersagemodus: Beobachte beide Bewegungen und schätze Treffzeit und Treffort.";
        } else {
          var a = currentProfile().a;
          if (Math.abs(a) < 0.001) {
            els.sceneHint.textContent = "a = 0: Dieser Spezialfall ist wieder eine gleichförmige Bewegung.";
          } else {
            els.sceneHint.textContent = "Pro Sekunde ändert sich v um " + fmt(a) + " m/s.";
          }
        }
      }

      function activePlotIds() {
        var plots = ["position", "velocity"];
        if (state.mode === "encounter") {
          plots.push("distance");
        } else if (state.mode === "accelerated") {
          plots.push("acceleration");
        }
        return plots;
      }

      function plotTarget(plotId) {
        if (plotId === "position") {
          return {
            title: els.positionPlotTitle,
            svg: els.positionPlotSvg,
            summary: els.positionPlotSummary,
            legend: els.positionPlotLegend
          };
        }
        if (plotId === "velocity") {
          return {
            title: els.velocityPlotTitle,
            svg: els.velocityPlotSvg,
            summary: els.velocityPlotSummary,
            legend: els.velocityPlotLegend
          };
        }
        return {
          title: els.extraPlotTitle,
          svg: els.extraPlotSvg,
          summary: els.extraPlotSummary,
          legend: els.extraPlotLegend
        };
      }

      function configurePlotCards() {
        var hasExtra = state.mode !== "single";
        els.extraPlotCard.hidden = !hasExtra;
        els.plotsGrid.setAttribute("data-count", hasExtra ? "3" : "2");
        plotCaches = {};
      }

      function plotConfiguration(plotId) {
        var config = {
          id: plotId,
          title: "",
          axis: "",
          unit: "",
          includeZero: true,
          summary: "",
          series: []
        };
        if (plotId === "position") {
          config.title = "Ort–Zeit";
          config.axis = "x";
          config.unit = "m";
          config.series = objectIds().map(function (id) {
            return {
              id: id,
              label: state.mode === "encounter" ? "x" + id : "x",
              color: id === "B" ? COLORS.orangeDark : COLORS.blueDark,
              value: function (time) { return positionAt(id, time); }
            };
          });
          if (!state.analysisHelpers) {
            config.summary = state.mode === "single" ?
              "Beobachte, wie sich x in gleichen Zeitabschnitten verändert." :
              state.mode === "encounter" ?
                "Beobachte beide Ortsgraphen und formuliere eine Vermutung." :
                "Beobachte, wie sich die Steilheit der Ortskurve verändert.";
          } else {
            config.summary = state.mode === "single" ?
              "Die konstante Steigung der Geraden ist die Geschwindigkeit v." :
              state.mode === "encounter" ?
                "Ein Schnittpunkt bedeutet: gleicher Ort zur gleichen Zeit." :
                Math.abs(currentProfile().a) < 0.0001 ?
                  "Bei a = 0 ist auch diese Ortsfunktion eine Gerade." :
                  "Die Tangentensteigung ist die momentane Geschwindigkeit v(t).";
          }
        } else if (plotId === "velocity") {
          config.title = "Geschwindigkeit–Zeit";
          config.axis = "v";
          config.unit = "m/s";
          config.series = objectIds().map(function (id) {
            return {
              id: id,
              label: state.mode === "encounter" ? "v" + id : "v",
              color: id === "B" ? COLORS.orangeDark : COLORS.blueDark,
              value: function (time) { return velocityAt(id, time); }
            };
          });
          if (!state.analysisHelpers) {
            config.summary = state.mode === "single" ?
              "Vergleiche die Höhe der Linie mit der eingestellten Geschwindigkeit." :
              state.mode === "encounter" ?
                "Vergleiche Richtung und Betrag beider Geschwindigkeiten." :
                "Beobachte, wie sich v in gleichen Zeitabschnitten verändert.";
          } else {
            config.summary = state.mode === "single" ?
              "Eine waagrechte Linie zeigt: v ist konstant; die Fläche entspricht Δx." :
              state.mode === "encounter" ?
                "Beide waagrechten Linien zeigen konstante Geschwindigkeiten." :
                "Die Steigung der Geraden ist die Beschleunigung a; die Fläche entspricht Δx.";
          }
        } else if (plotId === "distance") {
          config.title = "Abstand–Zeit";
          config.axis = "|Δx|";
          config.unit = "m";
          config.series = [{
            id: "distance",
            label: "|xB − xA|",
            color: COLORS.greenDark,
            value: function (time) {
              return Math.abs(positionAt("B", time) - positionAt("A", time));
            }
          }];
          var distanceAnalysis = meetingAnalysis();
          if (!state.meetingRevealed) {
            config.summary = "Beobachte den Abstand und vermute, ob und wann er 0 m erreicht.";
          } else if (distanceAnalysis.kind === "always") {
            config.summary = "Identische Bewegungen: Der Abstand bleibt immer 0 m.";
          } else if (distanceAnalysis.kind === "parallel") {
            config.summary = "Gleiche Geschwindigkeiten: Der Abstand bleibt konstant.";
          } else if (distanceAnalysis.kind === "past") {
            config.summary = "Das Treffen lag in der Vergangenheit; danach wächst der Abstand.";
          } else if (distanceAnalysis.kind === "later") {
            config.summary = "Der Abstand erreicht erst bei t = " + fmt(distanceAnalysis.time, 2) + " s den Wert 0 m.";
          } else if (distanceAnalysis.kind === "start") {
            config.summary = "Bei t = 0 ist der Abstand 0 m; danach trennen sich die Objekte.";
          } else {
            config.summary = "Beim Treffen fällt der Abstand auf 0 m.";
          }
        } else {
          config.title = "Beschleunigung–Zeit";
          config.axis = "a";
          config.unit = "m/s²";
          config.series = [{
            id: "A",
            label: "a",
            color: COLORS.cyanDark,
            value: function () { return accelerationAt(); }
          }];
          config.summary = state.analysisHelpers ?
            "Eine waagrechte Linie zeigt: a ist konstant." :
            "Vergleiche die Linie mit dem eingestellten Wert von a.";
        }
        return config;
      }

      function seriesPath(series, times, xScale, yScale) {
        return times.map(function (time, index) {
          return (index === 0 ? "M " : " L ") + xScale(time).toFixed(2) + " " + yScale(series.value(time)).toFixed(2);
        }).join("");
      }

      function comparisonSeriesFor(plotId, measurement) {
        if (!measurement) {
          return [];
        }
        var mode = state.mode;
        var profile = measurement.profile;
        var ids = mode === "encounter" ? ["A", "B"] : ["A"];
        if (plotId === "position") {
          return ids.map(function (id) {
            return {
              id: id,
              label: mode === "encounter" ? "x" + id : "x",
              color: id === "B" ? COLORS.orangeDark : COLORS.blueDark,
              value: function (time) { return positionFor(mode, profile, id, time); }
            };
          });
        }
        if (plotId === "velocity") {
          return ids.map(function (id) {
            return {
              id: id,
              label: mode === "encounter" ? "v" + id : "v",
              color: id === "B" ? COLORS.orangeDark : COLORS.blueDark,
              value: function (time) { return velocityFor(mode, profile, id, time); }
            };
          });
        }
        if (plotId === "distance") {
          return [{
            id: "distance",
            label: "|xB − xA|",
            color: COLORS.greenDark,
            value: function (time) {
              return Math.abs(
                positionFor(mode, profile, "B", time) - positionFor(mode, profile, "A", time)
              );
            }
          }];
        }
        return [{
          id: "A",
          label: "a",
          color: COLORS.cyanDark,
          value: function () { return accelerationFor(mode, profile); }
        }];
      }

      function drawPlot(plotId) {
        var target = plotTarget(plotId);
        var config = plotConfiguration(plotId);
        var comparison = currentComparisonState();
        var measurement = comparison.measurement;
        var comparisonSeries = comparisonSeriesFor(plotId, measurement);
        var domainTimes = plotTimesForProfile(
          state.mode,
          plotId,
          currentProfile(),
          currentProfile().tMax,
          90
        );
        var comparisonTimes = measurement ? plotTimesForProfile(
          state.mode,
          plotId,
          measurement.profile,
          measurement.visibleUntil,
          90
        ) : [];
        var meetingForSamples = meetingAnalysis();
        if ((plotId === "position" || plotId === "distance") && meetingForSamples &&
            (meetingForSamples.kind === "within" || meetingForSamples.kind === "start")) {
          if (!domainTimes.some(function (time) { return Math.abs(time - meetingForSamples.time) < 0.000001; })) {
            domainTimes.push(meetingForSamples.time);
            domainTimes.sort(function (a, b) { return a - b; });
          }
        }
        var yValues = [];
        config.series.forEach(function (series) {
          domainTimes.forEach(function (time) {
            yValues.push(series.value(time));
          });
        });
        comparisonSeries.forEach(function (series) {
          comparisonTimes.forEach(function (time) {
            yValues.push(series.value(time));
          });
        });
        var yDomain = stableDomain(plotId, yValues, config.includeZero, 5);
        var width = responsivePlotWidth(target.svg);
        var height = 260;
        target.svg.setAttribute("viewBox", "0 0 " + width + " " + height);
        var left = width < 360 ? 47 : 53;
        var right = 13;
        var top = 14;
        var bottom = 35;
        var plotWidth = width - left - right;
        var plotHeight = height - top - bottom;
        var requiredTimeMaximum = Math.max(
          currentProfile().tMax,
          measurement ? measurement.profile.tMax : 0
        );
        var tMax = stableTimeMaximum(requiredTimeMaximum);
        var xScale = function (time) {
          return left + time / tMax * plotWidth;
        };
        var yScale = function (value) {
          return top + (yDomain.max - value) / (yDomain.max - yDomain.min) * plotHeight;
        };
        var plotRight = width - right;
        var plotBottom = height - bottom;
        var clipId = "plotClip-" + plotId;
        var markup = "<defs><clipPath id='" + clipId + "'><rect x='" + left + "' y='" + top +
          "' width='" + plotWidth + "' height='" + plotHeight + "' /></clipPath></defs>" +
          "<rect x='0' y='0' width='" + width + "' height='" + height + "' fill='#fff' />";

        yDomain.ticks.forEach(function (tick) {
          var y = yScale(tick);
          markup += "<line x1='" + left + "' y1='" + y + "' x2='" + (width - right) + "' y2='" + y +
            "' stroke='#e7ecf3' stroke-width='1' />";
          markup += "<text x='" + (left - 9) + "' y='" + (y + 4) + "' text-anchor='end' fill='#68768d' font-size='11'>" +
            fmtAxis(tick) + "</text>";
        });

        var xTickCount = width < 360 ? 3 : width < 520 ? 4 : 5;
        for (var i = 0; i <= xTickCount; i += 1) {
          var timeTick = tMax * i / xTickCount;
          var x = xScale(timeTick);
          markup += "<line x1='" + x + "' y1='" + top + "' x2='" + x + "' y2='" + (height - bottom) +
            "' stroke='#eef2f7' stroke-width='1' />";
          markup += "<text x='" + x + "' y='" + (height - 16) + "' text-anchor='middle' fill='#68768d' font-size='11'>" +
            fmtAxis(timeTick) + "</text>";
        }

        markup += "<line x1='" + left + "' y1='" + top + "' x2='" + left + "' y2='" + (height - bottom) +
          "' stroke='#8b98aa' stroke-width='1.4' />";
        markup += "<line x1='" + left + "' y1='" + (height - bottom) + "' x2='" + (width - right) + "' y2='" +
          (height - bottom) + "' stroke='#8b98aa' stroke-width='1.4' />";
        markup += "<text x='15' y='" + (top + plotHeight / 2) +
          "' text-anchor='middle' transform='rotate(-90 15 " + (top + plotHeight / 2) +
          ")' fill='#5f6d82' font-size='11' font-weight='850'>" +
          escapeHtml(config.axis + " / " + config.unit) + "</text>";
        markup += "<text x='" + (width - right - 4) + "' y='" + (height - bottom - 8) +
          "' text-anchor='end' fill='#5f6d82' font-size='11' font-weight='850'>t / s</text>";

        if (comparisonSeries.length) {
          markup += "<g class='plot-comparison-curves' clip-path='url(#" + clipId + ")' aria-hidden='true'>";
          comparisonSeries.forEach(function (series) {
            markup += "<path d='" + seriesPath(series, comparisonTimes, xScale, yScale) +
              "' fill='none' stroke='" + series.color +
              "' stroke-width='2.4' stroke-dasharray='8 6' stroke-linecap='round'" +
              " stroke-linejoin='round' />";
          });
          markup += "</g>";
        }

        if (state.analysisHelpers && (state.mode === "single" || state.mode === "accelerated") &&
            plotId === "velocity") {
          markup += "<g id='plotAreaAid-velocity' class='plot-analysis-aid' aria-hidden='true' visibility='hidden'>" +
            "<g id='plotAreaShapes-velocity' clip-path='url(#" + clipId + ")'></g>" +
            "<text id='plotAreaLabel-velocity' x='" + (left + 8) + "' y='" + (plotBottom - 8) +
            "' fill='#536da8' font-size='11' font-weight='900' paint-order='stroke' stroke='#fff' stroke-width='4' stroke-linejoin='round'></text></g>";
        }

        var visibleTimes = visiblePlotTimes(plotId);
        config.series.forEach(function (series) {
          markup += "<path id='plotSeries-" + plotId + "-" + series.id + "' d='" + seriesPath(series, visibleTimes, xScale, yScale) + "' fill='none' stroke='" + series.color +
            "' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round' />";
        });

        var showSlopeAid = state.analysisHelpers &&
          ((state.mode === "single" && plotId === "position") ||
            (state.mode === "accelerated" && plotId === "velocity"));
        if (showSlopeAid) {
          var aidBoxWidth = Math.min(224, Math.max(160, plotWidth - 12));
          var aidBoxX = plotRight - aidBoxWidth - 5;
          markup += "<g id='plotSlopeAid-" + plotId + "' class='plot-analysis-aid' aria-hidden='true' visibility='hidden'>" +
            "<path id='plotSlopeFill-" + plotId + "' fill='" + COLORS.green + "' fill-opacity='0.12' stroke='none' />" +
            "<path id='plotSlopeLegs-" + plotId + "' fill='none' stroke='" + COLORS.green +
            "' stroke-width='2.2' stroke-dasharray='6 4' stroke-linejoin='round' />" +
            "<circle id='plotSlopeStart-" + plotId + "' r='4' fill='#fff' stroke='" + COLORS.green + "' stroke-width='2' />" +
            "<circle id='plotSlopeEnd-" + plotId + "' r='4' fill='#fff' stroke='" + COLORS.green + "' stroke-width='2' />" +
            "<text id='plotSlopeDt-" + plotId + "' fill='#39845b' font-size='10.5' font-weight='900' text-anchor='middle' paint-order='stroke' stroke='#fff' stroke-width='4' stroke-linejoin='round'></text>" +
            "<text id='plotSlopeDy-" + plotId + "' fill='#39845b' font-size='10.5' font-weight='900' paint-order='stroke' stroke='#fff' stroke-width='4' stroke-linejoin='round'></text>" +
            "<rect x='" + aidBoxX + "' y='" + (top + 5) + "' width='" + aidBoxWidth + "' height='38' rx='9' fill='#effaf4' fill-opacity='0.94' stroke='#8bd0a7' />" +
            "<text id='plotSlopeSummary1-" + plotId + "' x='" + (aidBoxX + 8) + "' y='" + (top + 20) + "' fill='#39845b' font-size='10.5' font-weight='850'></text>" +
            "<text id='plotSlopeSummary2-" + plotId + "' x='" + (aidBoxX + 8) + "' y='" + (top + 36) + "' fill='#2f6f4d' font-size='10.5' font-weight='950'></text></g>";
        }

        if (state.analysisHelpers && state.mode === "accelerated" && plotId === "position") {
          markup += "<g id='plotTangentAid-position' class='plot-analysis-aid' aria-hidden='true'>" +
            "<line id='plotTangentLine-position' clip-path='url(#" + clipId + ")' stroke='" + COLORS.green +
            "' stroke-width='2.5' stroke-dasharray='8 5' />" +
            "<text id='plotTangentLabel-position' fill='#39845b' font-size='11' font-weight='950' paint-order='stroke' stroke='#fff' stroke-width='4' stroke-linejoin='round'></text></g>";
        }

        var currentX = xScale(state.time);
        markup += "<line id='plotCursorLine-" + plotId + "' x1='" + currentX + "' y1='" + top + "' x2='" + currentX + "' y2='" + (height - bottom) +
          "' stroke='#68768d' stroke-width='1.4' stroke-dasharray='5 5' opacity='" + (state.time > 0.0001 ? "0.6" : "0") + "' />";
        config.series.forEach(function (series) {
          var currentY = yScale(series.value(state.time));
          markup += "<circle id='plotCursor-" + plotId + "-" + series.id + "' cx='" + currentX + "' cy='" + currentY + "' r='5.5' fill='#fff' stroke='" + series.color +
            "' stroke-width='3' />";
        });

        if (state.mode === "encounter" && plotId === "position") {
          var analysis = meetingAnalysis();
          if (analysis && analysis.kind === "always" && meetingMarkerVisible(analysis)) {
            markup += "<rect x='" + (left + 12) + "' y='" + (top + 8) +
              "' width='174' height='25' rx='12.5' fill='#effaf4' stroke='#8bd0a7' />";
            markup += "<text x='" + (left + 99) + "' y='" + (top + 25) +
              "' text-anchor='middle' fill='#39845b' font-size='11' font-weight='900'>identische Graphen</text>";
          } else if (analysis && (analysis.kind === "within" || analysis.kind === "start")) {
            var mx = xScale(analysis.time);
            var my = yScale(analysis.position);
            markup += "<g id='plotMeeting-" + plotId + "' opacity='" + (meetingMarkerVisible(analysis) ? "1" : "0") + "'>";
            markup += "<circle cx='" + mx + "' cy='" + my + "' r='8' fill='#fff' stroke='" + COLORS.green +
              "' stroke-width='3.5' />";
            markup += "<text x='" + (mx + 10) + "' y='" + (my - 10) + "' fill='#39845b' font-size='11' font-weight='900'>Treffen</text></g>";
          }
        }

        target.svg.innerHTML = markup;
        target.title.textContent = config.title;
        target.summary.textContent = config.summary;
        var plotAria = config.title + "-Diagramm, " + config.axis + " über t";
        if (state.analysisHelpers && state.mode === "single" && plotId === "position") {
          plotAria += ". Analysehilfe mit Steigungsdreieck für Geschwindigkeit.";
        } else if (state.analysisHelpers && state.mode === "single" && plotId === "velocity") {
          plotAria += ". Analysehilfe mit schattierter Fläche für die Ortsänderung.";
        } else if (state.analysisHelpers && state.mode === "accelerated" && plotId === "position") {
          plotAria += ". Analysehilfe mit Tangente für die momentane Geschwindigkeit.";
        } else if (state.analysisHelpers && state.mode === "accelerated" && plotId === "velocity") {
          plotAria += ". Analysehilfe mit Steigungsdreieck für Beschleunigung und schattierter Fläche für Ortsänderung.";
        }
        if (comparisonSeries.length) {
          plotAria += ". Gestrichelte Kurven zeigen die gespeicherte Vergleichsmessung. " +
            comparisonDescription(measurement) + ".";
        }
        target.svg.setAttribute("aria-label", plotAria);
        var legendMarkup = config.series.map(function (series) {
          return "<span class='legend-item legend-current'><span class='legend-line' style='border-color:" +
            series.color + "'></span>" + escapeHtml(series.label + (comparisonSeries.length ? " aktuell" : "")) +
            "</span>";
        }).join("");
        if (comparisonSeries.length) {
          legendMarkup += comparisonSeries.map(function (series) {
            return "<span class='legend-item legend-comparison'><span class='legend-line' style='border-color:" +
              series.color + "'></span>" + escapeHtml(series.label + " Vergleich") + "</span>";
          }).join("");
        }
        target.legend.innerHTML = legendMarkup;
        var markers = {};
        var paths = {};
        config.series.forEach(function (series) {
          markers[series.id] = target.svg.querySelector("#plotCursor-" + plotId + "-" + series.id);
          paths[series.id] = target.svg.querySelector("#plotSeries-" + plotId + "-" + series.id);
        });
        plotCaches[plotId] = {
          signature: plotSignature(plotId),
          renderedWidth: width,
          config: config,
          xScale: xScale,
          yScale: yScale,
          left: left,
          right: plotRight,
          top: top,
          bottom: plotBottom,
          plotWidth: plotWidth,
          plotHeight: plotHeight,
          tMax: tMax,
          cursorLine: target.svg.querySelector("#plotCursorLine-" + plotId),
          markers: markers,
          paths: paths,
          meetingMarker: target.svg.querySelector("#plotMeeting-" + plotId),
          meetingTime: meetingForSamples && (meetingForSamples.kind === "within" || meetingForSamples.kind === "start") ? meetingForSamples.time : null,
          analysis: {
            slopeGroup: target.svg.querySelector("#plotSlopeAid-" + plotId),
            slopeFill: target.svg.querySelector("#plotSlopeFill-" + plotId),
            slopeLegs: target.svg.querySelector("#plotSlopeLegs-" + plotId),
            slopeStart: target.svg.querySelector("#plotSlopeStart-" + plotId),
            slopeEnd: target.svg.querySelector("#plotSlopeEnd-" + plotId),
            slopeDt: target.svg.querySelector("#plotSlopeDt-" + plotId),
            slopeDy: target.svg.querySelector("#plotSlopeDy-" + plotId),
            slopeSummary1: target.svg.querySelector("#plotSlopeSummary1-" + plotId),
            slopeSummary2: target.svg.querySelector("#plotSlopeSummary2-" + plotId),
            tangentGroup: target.svg.querySelector("#plotTangentAid-" + plotId),
            tangentLine: target.svg.querySelector("#plotTangentLine-" + plotId),
            tangentLabel: target.svg.querySelector("#plotTangentLabel-" + plotId),
            areaGroup: target.svg.querySelector("#plotAreaAid-" + plotId),
            areaShapes: target.svg.querySelector("#plotAreaShapes-" + plotId),
            areaLabel: target.svg.querySelector("#plotAreaLabel-" + plotId)
          }
        };
        updatePlotAnalysis(plotId, plotCaches[plotId]);
      }

      function updateSlopeAnalysis(plotId, cache) {
        var aid = cache.analysis;
        if (!aid || !aid.slopeGroup) {
          return;
        }
        var time = state.time;
        if (time <= 0.0001) {
          aid.slopeGroup.setAttribute("visibility", "hidden");
          return;
        }
        var isPositionSlope = state.mode === "single" && plotId === "position";
        var isVelocitySlope = state.mode === "accelerated" && plotId === "velocity";
        if (!isPositionSlope && !isVelocitySlope) {
          aid.slopeGroup.setAttribute("visibility", "hidden");
          return;
        }
        var startValue = isPositionSlope ? positionAt("A", 0) : velocityAt("A", 0);
        var endValue = isPositionSlope ? positionAt("A", time) : velocityAt("A", time);
        var deltaValue = endValue - startValue;
        var quotient = deltaValue / time;
        var x0 = cache.xScale(0);
        var x1 = cache.xScale(time);
        var y0 = cache.yScale(startValue);
        var y1 = cache.yScale(endValue);
        var triangle = "M " + x0.toFixed(2) + " " + y0.toFixed(2) + " L " +
          x1.toFixed(2) + " " + y0.toFixed(2) + " L " + x1.toFixed(2) + " " +
          y1.toFixed(2) + " Z";
        var legs = "M " + x0.toFixed(2) + " " + y0.toFixed(2) + " L " +
          x1.toFixed(2) + " " + y0.toFixed(2) + " L " + x1.toFixed(2) + " " +
          y1.toFixed(2);
        aid.slopeGroup.setAttribute("visibility", "visible");
        aid.slopeFill.setAttribute("d", triangle);
        aid.slopeLegs.setAttribute("d", legs);
        aid.slopeStart.setAttribute("cx", x0);
        aid.slopeStart.setAttribute("cy", y0);
        aid.slopeEnd.setAttribute("cx", x1);
        aid.slopeEnd.setAttribute("cy", y1);

        var dtY = y0 > cache.top + 28 ? y0 - 8 : y0 + 17;
        dtY = clamp(dtY, cache.top + 12, cache.bottom - 6);
        aid.slopeDt.setAttribute("x", (x0 + x1) / 2);
        aid.slopeDt.setAttribute("y", dtY);
        aid.slopeDt.textContent = "Δt = " + fmt(time, 2) + " s";
        aid.slopeDt.setAttribute("opacity", x1 - x0 > 44 ? "1" : "0");

        var labelOnRight = x1 < cache.right - 74;
        aid.slopeDy.setAttribute("x", labelOnRight ? x1 + 7 : x1 - 7);
        aid.slopeDy.setAttribute("y", clamp((y0 + y1) / 2 - 5, cache.top + 14, cache.bottom - 6));
        aid.slopeDy.setAttribute("text-anchor", labelOnRight ? "start" : "end");
        aid.slopeDy.textContent = (isPositionSlope ? "Δx = " : "Δv = ") + fmt(deltaValue) +
          (isPositionSlope ? " m" : " m/s");
        aid.slopeDy.setAttribute("opacity", Math.abs(y1 - y0) > 18 ? "1" : "0");

        aid.slopeSummary1.textContent = "Δt = " + fmt(time, 2) + " s; " +
          (isPositionSlope ? "Δx = " : "Δv = ") + fmt(deltaValue) +
          (isPositionSlope ? " m" : " m/s");
        aid.slopeSummary2.textContent = (isPositionSlope ? "v = Δx/Δt = " : "a = Δv/Δt = ") +
          fmt(quotient) + (isPositionSlope ? " m/s" : " m/s²");
      }

      function updateTangentAnalysis(cache) {
        var aid = cache.analysis;
        if (!aid || !aid.tangentGroup || !aid.tangentLine || !aid.tangentLabel) {
          return;
        }
        var time = state.time;
        var currentPosition = positionAt("A", time);
        var currentVelocity = velocityAt("A", time);
        var tangentAtStart = currentPosition - currentVelocity * time;
        var tangentAtEnd = currentPosition + currentVelocity * (cache.tMax - time);
        var pointX = cache.xScale(time);
        var pointY = cache.yScale(currentPosition);
        aid.tangentLine.setAttribute("x1", cache.left);
        aid.tangentLine.setAttribute("y1", cache.yScale(tangentAtStart));
        aid.tangentLine.setAttribute("x2", cache.right);
        aid.tangentLine.setAttribute("y2", cache.yScale(tangentAtEnd));
        var labelOnRight = pointX < cache.right - 105;
        aid.tangentLabel.setAttribute("x", labelOnRight ? pointX + 9 : pointX - 9);
        aid.tangentLabel.setAttribute("text-anchor", labelOnRight ? "start" : "end");
        aid.tangentLabel.setAttribute("y", clamp(pointY < cache.top + 27 ? pointY + 20 : pointY - 11,
          cache.top + 14, cache.bottom - 7));
        aid.tangentLabel.textContent = "v(t) = " + fmt(currentVelocity) + " m/s";
      }

      function updateVelocityAreaAnalysis(cache) {
        var aid = cache.analysis;
        if (!aid || !aid.areaGroup || !aid.areaShapes || !aid.areaLabel) {
          return;
        }
        var time = state.time;
        if (time <= 0.0001) {
          aid.areaGroup.setAttribute("visibility", "hidden");
          aid.areaShapes.innerHTML = "";
          return;
        }
        var p = currentProfile();
        var breaks = [0];
        if (state.mode === "accelerated" && Math.abs(p.a) > 0.000001) {
          var zeroTime = -p.v0 / p.a;
          if (zeroTime > 0.000001 && zeroTime < time - 0.000001) {
            breaks.push(zeroTime);
          }
        }
        breaks.push(time);
        var zeroY = cache.yScale(0);
        var shapes = "";
        for (var i = 0; i < breaks.length - 1; i += 1) {
          var startTime = breaks[i];
          var endTime = breaks[i + 1];
          var startVelocity = velocityAt("A", startTime);
          var endVelocity = velocityAt("A", endTime);
          var middleVelocity = velocityAt("A", (startTime + endTime) / 2);
          var startX = cache.xScale(startTime);
          var endX = cache.xScale(endTime);
          var color = middleVelocity < 0 ? COLORS.orange : COLORS.blue;
          shapes += "<path d='M " + startX.toFixed(2) + " " + zeroY.toFixed(2) + " L " +
            startX.toFixed(2) + " " + cache.yScale(startVelocity).toFixed(2) + " L " +
            endX.toFixed(2) + " " + cache.yScale(endVelocity).toFixed(2) + " L " +
            endX.toFixed(2) + " " + zeroY.toFixed(2) + " Z' fill='" + color +
            "' fill-opacity='0.18' stroke='none' />";
        }
        aid.areaGroup.setAttribute("visibility", "visible");
        aid.areaShapes.innerHTML = shapes;
        aid.areaLabel.textContent = "Fläche: Δx = " +
          fmt(positionAt("A", time) - positionAt("A", 0)) + " m";
      }

      function updatePlotAnalysis(plotId, cache) {
        if (!state.analysisHelpers || !cache || !cache.analysis) {
          return;
        }
        updateSlopeAnalysis(plotId, cache);
        if (state.mode === "accelerated" && plotId === "position") {
          updateTangentAnalysis(cache);
        }
        if ((state.mode === "single" || state.mode === "accelerated") && plotId === "velocity") {
          updateVelocityAreaAnalysis(cache);
        }
      }

      function updatePlotCursors() {
        activePlotIds().forEach(function (plotId) {
          var cache = plotCaches[plotId];
          if (!cache || cache.signature !== plotSignature(plotId) || !cache.cursorLine) {
            drawPlot(plotId);
            return;
          }
          var currentX = cache.xScale(state.time);
          cache.cursorLine.setAttribute("x1", currentX);
          cache.cursorLine.setAttribute("x2", currentX);
          cache.cursorLine.setAttribute("opacity", state.time > 0.0001 ? "0.6" : "0");
          var visibleTimes = visiblePlotTimes(plotId);
          cache.config.series.forEach(function (series) {
            var marker = cache.markers[series.id];
            var path = cache.paths[series.id];
            if (path) {
              path.setAttribute("d", seriesPath(series, visibleTimes, cache.xScale, cache.yScale));
            }
            if (marker) {
              marker.setAttribute("cx", currentX);
              marker.setAttribute("cy", cache.yScale(series.value(state.time)));
            }
          });
          if (cache.meetingMarker && Number.isFinite(cache.meetingTime)) {
            cache.meetingMarker.setAttribute("opacity", meetingMarkerVisible(meetingAnalysis()) ? "1" : "0");
          }
          updatePlotAnalysis(plotId, cache);
        });
      }

      function makeNumericQuestion(prompt, correctValue, candidates, unit, explanation, correctPosition, digits) {
        var places = typeof digits === "number" ? digits : 1;
        var answerLabel = function (value) {
          return fmt(value, places) + (unit ? " " + unit : "");
        };
        var values = [correctValue];
        var labels = [answerLabel(correctValue)];
        var addIfDistinct = function (candidate) {
          var label = answerLabel(candidate);
          if (Number.isFinite(candidate) && labels.indexOf(label) === -1) {
            values.push(candidate);
            labels.push(label);
          }
        };
        candidates.forEach(function (candidate) {
          addIfDistinct(candidate);
        });
        var scale = Math.max(Math.pow(10, -places) * 2, Math.abs(correctValue) * 0.25);
        var attempt = 1;
        while (values.length < 3 && attempt < 50) {
          addIfDistinct(correctValue + attempt * scale);
          if (values.length < 3) {
            addIfDistinct(correctValue - attempt * scale);
          }
          attempt += 1;
        }
        var position = clamp(correctPosition || 0, 0, 2);
        var wrong = values.slice(1, 3);
        var ordered = [];
        var wrongIndex = 0;
        for (var i = 0; i < 3; i += 1) {
          ordered.push(i === position ? correctValue : wrong[wrongIndex++]);
        }
        return {
          prompt: prompt,
          answers: ordered.map(function (value) {
            return answerLabel(value);
          }),
          correct: position,
          explanation: explanation,
          kind: "Rechnen"
        };
      }

      function quizVisualMarkup(type) {
        var start = [
          "<svg viewBox='0 0 240 72' preserveAspectRatio='xMidYMid meet' aria-hidden='true'>",
          "<rect width='240' height='72' fill='#fbfcff' />",
          "<path d='M 27 8 V 57 H 228' fill='none' stroke='#a8b3c3' stroke-width='1.4' />",
          "<path d='M 27 33 H 228' fill='none' stroke='#e1e7f0' stroke-width='1' stroke-dasharray='4 4' />",
          "<text x='226' y='68' text-anchor='end' fill='#68768d' font-size='8' font-weight='800'>t</text>"
        ].join("");
        var end = "</svg>";
        var blue = COLORS.blue;
        var orange = COLORS.orange;
        var cyan = COLORS.cyan;
        var green = COLORS.green;
        var content = "";
        if (type === "xt-up") {
          content = "<text x='10' y='13' fill='#68768d' font-size='8' font-weight='900'>x</text><path d='M 32 54 L 222 13' fill='none' stroke='" + blue + "' stroke-width='3.2' stroke-linecap='round' />";
        } else if (type === "vt-negative") {
          content = "<text x='10' y='13' fill='#68768d' font-size='8' font-weight='900'>v</text><path d='M 32 46 H 222' fill='none' stroke='" + blue + "' stroke-width='3.2' stroke-linecap='round' />";
        } else if (type === "xt-horizontal") {
          content = "<text x='10' y='13' fill='#68768d' font-size='8' font-weight='900'>x</text><path d='M 32 27 H 222' fill='none' stroke='" + blue + "' stroke-width='3.2' stroke-linecap='round' />";
        } else if (type === "xt-parallel") {
          content = "<text x='10' y='13' fill='#68768d' font-size='8' font-weight='900'>x</text><path d='M 32 49 L 222 17' fill='none' stroke='" + blue + "' stroke-width='3' /><path d='M 32 58 L 222 26' fill='none' stroke='" + orange + "' stroke-width='3' />";
        } else if (type === "xt-intersection") {
          content = "<text x='10' y='13' fill='#68768d' font-size='8' font-weight='900'>x</text><path d='M 32 54 L 222 13' fill='none' stroke='" + blue + "' stroke-width='3' /><path d='M 32 17 L 222 48' fill='none' stroke='" + orange + "' stroke-width='3' /><circle cx='139' cy='31' r='4' fill='#fff' stroke='" + green + "' stroke-width='2.5' />";
        } else if (type === "xt-catchup") {
          content = "<text x='10' y='13' fill='#68768d' font-size='8' font-weight='900'>x</text><path d='M 32 54 L 222 12' fill='none' stroke='" + blue + "' stroke-width='3' /><path d='M 32 30 L 222 20' fill='none' stroke='" + orange + "' stroke-width='3' /><circle cx='181' cy='21.5' r='4' fill='#fff' stroke='" + green + "' stroke-width='2.5' />";
        } else if (type === "vt-headon") {
          content = "<text x='10' y='13' fill='#68768d' font-size='8' font-weight='900'>v</text><path d='M 32 18 H 222' fill='none' stroke='" + blue + "' stroke-width='3' /><path d='M 32 48 H 222' fill='none' stroke='" + orange + "' stroke-width='3' />";
        } else if (type === "xt-window") {
          content = "<text x='10' y='13' fill='#68768d' font-size='8' font-weight='900'>x</text><path d='M 32 53 L 222 34' fill='none' stroke='" + blue + "' stroke-width='3' /><path d='M 32 22 L 222 14' fill='none' stroke='" + orange + "' stroke-width='3' />";
        } else if (type === "vt-gap") {
          content = "<text x='10' y='13' fill='#68768d' font-size='8' font-weight='900'>v</text><path d='M 32 17 H 222' fill='none' stroke='" + blue + "' stroke-width='3' /><path d='M 32 49 H 222' fill='none' stroke='" + orange + "' stroke-width='3' /><path d='M 207 20 V 46' stroke='" + green + "' stroke-width='2' stroke-dasharray='3 3' />";
        } else if (type === "vt-up") {
          content = "<text x='10' y='13' fill='#68768d' font-size='8' font-weight='900'>v</text><path d='M 32 52 L 222 13' fill='none' stroke='" + blue + "' stroke-width='3.2' stroke-linecap='round' />";
        } else if (type === "vt-crossdown") {
          content = "<text x='10' y='13' fill='#68768d' font-size='8' font-weight='900'>v</text><path d='M 32 13 L 222 53' fill='none' stroke='" + blue + "' stroke-width='3.2' /><circle cx='127' cy='33' r='3.5' fill='#fff' stroke='" + orange + "' stroke-width='2' />";
        } else if (type === "xt-flatten") {
          content = "<text x='10' y='13' fill='#68768d' font-size='8' font-weight='900'>x</text><path d='M 32 54 Q 112 15 222 13' fill='none' stroke='" + blue + "' stroke-width='3.2' stroke-linecap='round' />";
        } else if (type === "combined-turn") {
          content = "<text x='8' y='13' fill='#68768d' font-size='8' font-weight='900'>x</text><path d='M 20 14 Q 66 58 113 17' fill='none' stroke='" + blue + "' stroke-width='3' /><path d='M 120 8 V 57 H 229' fill='none' stroke='#a8b3c3' stroke-width='1.2' /><path d='M 126 51 L 224 14' fill='none' stroke='" + cyan + "' stroke-width='3' /><text x='126' y='13' fill='#68768d' font-size='8' font-weight='900'>v</text>";
        } else if (type === "at-positive") {
          content = "<text x='10' y='13' fill='#68768d' font-size='8' font-weight='900'>a</text><path d='M 32 19 H 222' fill='none' stroke='" + cyan + "' stroke-width='3.2' stroke-linecap='round' />";
        } else if (type === "vt-parallel") {
          content = "<text x='10' y='13' fill='#68768d' font-size='8' font-weight='900'>v</text><path d='M 32 50 L 222 18' fill='none' stroke='" + blue + "' stroke-width='3' /><path d='M 32 57 L 222 25' fill='none' stroke='" + orange + "' stroke-width='3' />";
        }
        return start + content + end;
      }

      function singleUnderstandingQuestions() {
        return [
          {
            kind: "Diagramm lesen",
            visual: "xt-up",
            visualAlt: "Geradlinig ansteigende Linie in einem x–t-Diagramm",
            prompt: "Die Linie im x–t-Diagramm steigt geradlinig an. Was folgt daraus?",
            answers: ["v wird mit der Zeit immer grösser.", "v ist positiv und konstant.", "Das Objekt steht still."],
            correct: 1,
            explanation: "Eine Gerade hat eine konstante Steigung. Die positive Steigung bedeutet eine konstante Bewegung in positive x-Richtung."
          },
          {
            kind: "Diagramme verknüpfen",
            visual: "vt-negative",
            visualAlt: "Waagrechte v–t-Linie unterhalb von v gleich null",
            prompt: "Die v–t-Linie liegt waagrecht unterhalb von v = 0. Wie sieht x(t) aus?",
            answers: ["Als geradlinig fallende Linie.", "Als nach oben gekrümmte Linie.", "Als waagrechte Linie."],
            correct: 0,
            explanation: "Ein konstantes negatives v ergibt im x–t-Diagramm eine Gerade mit negativer Steigung."
          },
          {
            kind: "Diagramme verknüpfen",
            visual: "xt-horizontal",
            visualAlt: "Waagrechte Linie in einem x–t-Diagramm",
            prompt: "Welches v–t-Diagramm gehört zu diesem waagrechten x–t-Diagramm?",
            answers: ["Eine ansteigende v–t-Linie.", "Eine waagrechte Linie bei v = 0.", "Eine waagrechte Linie unterhalb von v = 0."],
            correct: 1,
            explanation: "Der Ort ändert sich nicht. Deshalb ist die Geschwindigkeit zu jedem Zeitpunkt null."
          },
          {
            kind: "Neuer Fall",
            visual: "xt-parallel",
            visualAlt: "Zwei parallele Geraden in einem x–t-Diagramm",
            prompt: "x₀ wird vergrössert, v bleibt gleich. Was ändert sich?",
            answers: ["Die x–t-Linie wird steiler und v–t liegt höher.", "Die x–t-Linie verschiebt sich parallel; v–t bleibt unverändert.", "Beide Diagramme bleiben unverändert."],
            correct: 1,
            explanation: "x₀ bestimmt nur den Startpunkt der Ortsgeraden. Die Steigung und damit v ändern sich nicht."
          },
          {
            kind: "Neuer Fall",
            visual: "xt-up",
            visualAlt: "Ansteigende Gerade in einem x–t-Diagramm",
            prompt: "Bei gleichem x₀ wird eine grössere konstante positive Geschwindigkeit gewählt. Was sieht man?",
            answers: ["x–t wird gekrümmt und v–t steigt an.", "x–t wird nur parallel verschoben.", "x–t wird steiler; v–t bleibt waagrecht, liegt aber höher."],
            correct: 2,
            explanation: "Ein grösseres konstantes v macht die Ortsgerade steiler und verschiebt die waagrechte v–t-Linie nach oben."
          },
          {
            kind: "Vergleichen",
            visual: "xt-parallel",
            visualAlt: "Zwei parallele x–t-Geraden mit verschiedenen Anfangsorten",
            prompt: "Zwei x–t-Linien verlaufen parallel. Was gilt für die Bewegungen?",
            answers: ["Gleicher Anfangsort, aber verschiedene Geschwindigkeiten.", "Gleiche Geschwindigkeit, aber verschiedene Anfangsorte.", "Beide Bewegungen sind beschleunigt."],
            correct: 1,
            explanation: "Parallele Geraden haben dieselbe Steigung und damit dieselbe Geschwindigkeit."
          }
        ];
      }

      function encounterUnderstandingQuestions() {
        return [
          {
            kind: "Diagramm lesen",
            visual: "xt-intersection",
            visualAlt: "Zwei x–t-Geraden mit einem Schnittpunkt",
            prompt: "Was bedeutet der Schnittpunkt zweier x–t-Linien?",
            answers: ["Beide sind zur selben Zeit am selben Ort.", "Beide haben dort dieselbe Geschwindigkeit.", "Beide wechseln dort ihre Richtung."],
            correct: 0,
            explanation: "Am Schnittpunkt stimmen sowohl die Zeit- als auch die Ortskoordinate beider Objekte überein."
          },
          {
            kind: "Diagramm lesen",
            visual: "xt-parallel",
            visualAlt: "Zwei parallele x–t-Geraden",
            prompt: "Was bedeuten parallele x–t-Linien?",
            answers: ["Der Abstand wird immer grösser.", "Die Geschwindigkeiten sind gleich und der Abstand bleibt konstant.", "Die Objekte treffen sich am Ende."],
            correct: 1,
            explanation: "Gleiche Steigungen bedeuten gleiche Geschwindigkeiten. Der vertikale Abstand der Linien bleibt gleich."
          },
          {
            kind: "Neuer Fall",
            visual: "xt-catchup",
            visualAlt: "Eine steilere x–t-Gerade holt eine andere Gerade ein",
            prompt: "A startet hinter B, seine x–t-Linie ist aber steiler. Was geschieht?",
            answers: ["Beide wechseln die Richtung.", "B wird plötzlich beschleunigt.", "A holt B am Schnittpunkt ein."],
            correct: 2,
            explanation: "Die steilere Linie gehört zur grösseren Geschwindigkeit. Ihr Schnittpunkt ist der Zeitpunkt des Einholens."
          },
          {
            kind: "Diagramme vorhersagen",
            visual: "vt-headon",
            visualAlt: "Eine waagrechte v–t-Linie oberhalb und eine unterhalb von null",
            prompt: "A bewegt sich in positive, B in negative x-Richtung. Beide Geschwindigkeiten sind konstant. Wie sieht v–t aus?",
            answers: ["Beide Linien liegen waagrecht oberhalb von null.", "A liegt waagrecht oberhalb, B waagrecht unterhalb von null.", "Beide Linien sind schräg."],
            correct: 1,
            explanation: "Konstante Geschwindigkeiten ergeben waagrechte Linien; ihre Richtung erkennt man am Vorzeichen."
          },
          {
            kind: "Ausschnitt beurteilen",
            visual: "xt-window",
            visualAlt: "Zwei x–t-Linien ohne Schnittpunkt im gezeigten Zeitfenster",
            prompt: "Im sichtbaren Zeitfenster schneiden sich die Linien nicht. Was darf man sicher sagen?",
            answers: ["Die Objekte treffen sich niemals.", "Im gezeigten Zeitfenster treffen sie sich nicht; über später weiss man noch nichts.", "Ihre Geschwindigkeiten sind gleich."],
            correct: 1,
            explanation: "Ein Diagrammausschnitt erlaubt nur Aussagen über seinen dargestellten Bereich."
          },
          {
            kind: "Vergleichen",
            visual: "vt-gap",
            visualAlt: "Zwei waagrechte v–t-Linien mit markiertem vertikalem Abstand",
            prompt: "In einem neuen Fall ist der vertikale Abstand zwischen zwei waagrechten v–t-Linien grösser. Was bedeutet das?",
            answers: ["Der Betrag der Relativgeschwindigkeit ist grösser; der Ortsunterschied ändert sich schneller.", "Nur die Anfangsorte wurden verändert.", "Die Geschwindigkeiten sind nun gleich."],
            correct: 0,
            explanation: "Der Abstand der v–t-Linien zeigt den Betrag der relativen Geschwindigkeit."
          }
        ];
      }

      function acceleratedUnderstandingQuestions() {
        return [
          {
            kind: "Diagramm lesen",
            visual: "vt-up",
            visualAlt: "Geradlinig ansteigende Linie in einem v–t-Diagramm",
            prompt: "Die v–t-Linie steigt geradlinig. Was gilt?",
            answers: ["Die Beschleunigung wird immer grösser.", "Die Geschwindigkeit ist konstant.", "Die Beschleunigung ist positiv und konstant."],
            correct: 2,
            explanation: "Die konstante positive Steigung der v–t-Geraden ist die konstante positive Beschleunigung."
          },
          {
            kind: "Bewegung deuten",
            visual: "vt-crossdown",
            visualAlt: "Fallende v–t-Linie, die v gleich null schneidet",
            prompt: "Die v–t-Linie fällt und schneidet v = 0. Wie bewegt sich das Objekt?",
            answers: ["Es wird langsamer, ist kurz in Ruhe und bewegt sich danach rückwärts.", "Es bleibt ab dem Schnittpunkt dauerhaft stehen.", "Es wird vorwärts immer schneller."],
            correct: 0,
            explanation: "Vor dem Schnittpunkt ist v positiv, am Schnittpunkt null und danach negativ."
          },
          {
            kind: "Diagramme verknüpfen",
            visual: "xt-flatten",
            visualAlt: "Steigende x–t-Kurve, die mit der Zeit flacher wird",
            prompt: "Die x–t-Kurve steigt, wird aber immer flacher. Was gilt in diesem Abschnitt?",
            answers: ["v ist negativ und a positiv.", "v ist positiv und konstant.", "v ist positiv, nimmt aber ab; a ist negativ."],
            correct: 2,
            explanation: "Die positive Steigung zeigt v > 0. Weil die Steigung kleiner wird, nimmt v ab."
          },
          {
            kind: "Neuer Fall",
            visual: "combined-turn",
            visualAlt: "x–t-Kurve mit Minimum und ansteigende v–t-Gerade durch null",
            prompt: "Zunächst gilt v₀ < 0 und a > 0. Innerhalb des Zeitfensters wird v = 0. Welche Diagramme passen?",
            answers: ["x–t fällt als Gerade; v–t bleibt waagrecht.", "x–t fällt bis zu einem Minimum und steigt danach; v–t steigt durch null.", "x–t steigt bis zu einem Maximum und fällt danach."],
            correct: 1,
            explanation: "Das Objekt bewegt sich zuerst rückwärts, hält kurz an und kehrt dann seine Richtung um."
          },
          {
            kind: "Vergleichen",
            visual: "vt-parallel",
            visualAlt: "Zwei parallele ansteigende v–t-Geraden",
            prompt: "Zwei Bewegungen haben dieselbe Beschleunigung, aber verschiedene Startgeschwindigkeiten. Wie sehen ihre v–t-Linien aus?",
            answers: ["Parallel, mit verschiedenen Anfangswerten.", "Vollständig identisch.", "Mit verschiedenen Steigungen und gleichem Anfangswert."],
            correct: 0,
            explanation: "Dieselbe Beschleunigung bedeutet dieselbe Steigung; verschiedene v₀ verschieben die Geraden."
          },
          {
            kind: "Diagramme verknüpfen",
            visual: "at-positive",
            visualAlt: "Waagrechte a–t-Linie oberhalb von null",
            prompt: "Die a–t-Linie liegt konstant oberhalb von null. Welche Kombination passt?",
            answers: ["v–t ist waagrecht und x–t geradlinig.", "v–t fällt und x–t ist nach unten gekrümmt.", "v–t steigt geradlinig und x–t ist nach oben gekrümmt."],
            correct: 2,
            explanation: "Positives konstantes a lässt v linear steigen und krümmt x(t) nach oben."
          }
        ];
      }

      function understandingQuestions() {
        if (state.mode === "single") {
          return singleUnderstandingQuestions();
        }
        if (state.mode === "encounter") {
          return encounterUnderstandingQuestions();
        }
        return acceleratedUnderstandingQuestions();
      }

      function singleCalculationQuestions() {
        var p = profiles.single;
        var tq = Math.min(4, p.tMax);
        var position = p.x0 + p.v * tq;
        var deltaX = p.v * p.tMax;
        return [
          makeNumericQuestion(
            "Wo befindet sich Objekt A nach " + fmt(tq) + " s?",
            position,
            [p.v * tq, p.x0 + 0.5 * p.v * tq, p.x0 - p.v * tq],
            "m",
            "Mit x = x₀ + v·t erhält man " + fmt(p.x0) + " m + " + fmt(p.v) + " m/s · " + fmt(tq) + " s = " + fmt(position) + " m.",
            1,
            1
          ),
          makeNumericQuestion(
            "Welche Ortsänderung Δx entsteht während der ganzen Beobachtungszeit?",
            deltaX,
            [Math.abs(deltaX), p.x0 + deltaX, p.x0],
            "m",
            "Für eine gleichförmige Bewegung gilt Δx = v·Δt = " + fmt(p.v) + " m/s · " + fmt(p.tMax) + " s = " + fmt(deltaX) + " m.",
            2,
            1
          )
        ];
      }

      function encounterCalculationQuestions() {
        var p = profiles.encounter;
        var analysis = meetingAnalysis();
        var relative = Math.abs(p.vA - p.vB);
        var questions = [];
        var startDistance = Math.abs(p.xB0 - p.xA0);
        questions.push(makeNumericQuestion(
          "Wie gross ist der Abstand von A und B bei t = 0?",
          startDistance,
          [Math.abs(p.xB0 + p.xA0), startDistance + 10, Math.abs(startDistance - 10)],
          "m",
          "Der Anfangsabstand ist |xB₀ − xA₀| = " + fmt(startDistance) + " m.",
          0,
          1
        ));
        if (analysis.kind !== "always" && Number.isFinite(analysis.time) && analysis.time >= 0) {
          questions.push(makeNumericQuestion(
            "Nach welcher Zeit liegt die rechnerische Begegnung?",
            analysis.time,
            [Math.abs(p.xB0 - p.xA0) / Math.max(0.5, Math.abs(p.vA) + Math.abs(p.vB)), analysis.time + 2, Math.abs(p.xB0 - p.xA0) / Math.max(0.5, relative + 2)],
            "s",
            "Setze xA(t) = xB(t). Daraus folgt t = (xB₀ − xA₀)/(vA − vB) = " + fmt(analysis.time, 2) + " s.",
            1,
            2
          ));
        }
        questions.push(makeNumericQuestion(
          "Wie gross ist der Betrag der relativen Geschwindigkeit |vA − vB|?",
          relative,
          [Math.abs(p.vA + p.vB), relative + 1, relative + 2],
          "m/s",
          "|vA − vB| = |" + fmt(p.vA) + " − (" + fmt(p.vB) + ")| = " + fmt(relative) + " m/s.",
          0,
          1
        ));
        var tq = Math.min(4, p.tMax);
        var distanceAtTq = Math.abs((p.xB0 + p.vB * tq) - (p.xA0 + p.vA * tq));
        questions.push(makeNumericQuestion(
          "Wie gross ist der Abstand nach " + fmt(tq) + " s?",
          distanceAtTq,
          [startDistance + relative * tq, Math.abs(startDistance - 0.5 * relative * tq), startDistance],
          "m",
          "Berechne zuerst beide Orte bei t = " + fmt(tq) + " s und bilde danach |xB − xA| = " + fmt(distanceAtTq) + " m.",
          1,
          1
        ));
        if (analysis.kind !== "always" && Number.isFinite(analysis.time) && analysis.time >= 0) {
          questions.push(makeNumericQuestion(
            "An welchem Ort liegt die rechnerische Begegnung?",
            analysis.position,
            [p.xA0 + p.vB * analysis.time, p.xB0 + p.vA * analysis.time, (p.xA0 + p.xB0) / 2],
            "m",
            "Einsetzen in eine der Ortsfunktionen ergibt xT = " + fmt(analysis.position) + " m.",
            2,
            1
          ));
        }
        return questions;
      }

      function acceleratedCalculationQuestions() {
        var p = profiles.accelerated;
        var tq = Math.min(4, p.tMax);
        var velocity = p.v0 + p.a * tq;
        var position = p.x0 + p.v0 * tq + 0.5 * p.a * tq * tq;
        var questions = [
          makeNumericQuestion(
            "Welche Geschwindigkeit hat A nach " + fmt(tq) + " s?",
            velocity,
            [p.a * tq, p.v0 + 0.5 * p.a * tq, p.v0 - p.a * tq],
            "m/s",
            "v = v₀ + a·t = " + fmt(p.v0) + " m/s " + signed(p.a, 1) + " m/s² · " + fmt(tq) + " s = " + fmt(velocity) + " m/s.",
            0,
            1
          ),
          makeNumericQuestion(
            "Wo befindet sich A nach " + fmt(tq) + " s?",
            position,
            [p.x0 + p.v0 * tq + p.a * tq * tq, p.v0 * tq + 0.5 * p.a * tq * tq, p.x0 + p.v0 * tq],
            "m",
            "x = x₀ + v₀t + ½at². Eingesetzt ergibt das " + fmt(position) + " m.",
            1,
            1
          )
        ];
        var stopTime = Math.abs(p.a) > 0.0001 ? -p.v0 / p.a : -1;
        if (stopTime >= 0 && stopTime <= p.tMax) {
          questions.push(makeNumericQuestion(
            "Wann ist A momentan in Ruhe, also v = 0?",
            stopTime,
            [stopTime + 1, stopTime * 2, stopTime / 2],
            "s",
            "0 = v₀ + a·t liefert t = −v₀/a = " + fmt(stopTime, 2) + " s.",
            2,
            2
          ));
        } else {
          var deltaV = p.a * p.tMax;
          questions.push(makeNumericQuestion(
            "Welche Geschwindigkeitsänderung Δv entsteht in der ganzen Beobachtungszeit?",
            deltaV,
            [0.5 * p.a * p.tMax, -p.a * p.tMax, p.v0 + deltaV],
            "m/s",
            "Die Geschwindigkeitsänderung ist Δv = a·Δt = " + fmt(deltaV) + " m/s.",
            2,
            1
          ));
        }
        return questions;
      }

      function currentQuestions() {
        if (state.quizType === "understanding") {
          return understandingQuestions();
        }
        if (state.mode === "single") {
          return singleCalculationQuestions();
        }
        if (state.mode === "encounter") {
          return encounterCalculationQuestions();
        }
        return acceleratedCalculationQuestions();
      }

      function currentQuizState() {
        return quizStates[state.mode][state.quizType];
      }

      function renderQuiz() {
        var questions = currentQuestions();
        var quiz = currentQuizState();
        if (quiz.index >= questions.length) {
          quiz.index = 0;
          quiz.score = 0;
          quiz.answered = false;
          quiz.selected = -1;
        }
        var question = questions[quiz.index];
        var understanding = state.quizType === "understanding";
        els.quizTitle.textContent = understanding ? "Verständnis-Quiz" : "Rechenaufgaben";
        els.quizIntro.textContent = understanding ?
          "Diagramme lesen und Bewegungen vorhersagen – ohne zu rechnen." :
          "Berechne mit den aktuell eingestellten Werten.";
        els.quizTypePicker.querySelectorAll("[data-quiz-type]").forEach(function (button) {
          button.setAttribute("aria-pressed", button.getAttribute("data-quiz-type") === state.quizType ? "true" : "false");
        });
        els.quizScore.textContent = quiz.score + " / " + questions.length;
        els.quizCounter.textContent = "Frage " + (quiz.index + 1) + " von " + questions.length;
        els.quizKind.textContent = question.kind || (understanding ? "Verstehen" : "Rechnen");
        els.quizQuestion.textContent = question.prompt;
        if (question.visual) {
          els.quizVisual.hidden = false;
          els.quizVisual.innerHTML = quizVisualMarkup(question.visual);
          els.quizVisual.setAttribute("aria-label", question.visualAlt || "Qualitative Diagrammskizze");
        } else {
          els.quizVisual.hidden = true;
          els.quizVisual.innerHTML = "";
          els.quizVisual.removeAttribute("aria-label");
        }
        var letters = ["A", "B", "C"];
        els.quizAnswers.innerHTML = question.answers.map(function (answer, index) {
          var classes = "answer-button";
          if (quiz.answered && index === question.correct) {
            classes += " correct";
          } else if (quiz.answered && index === quiz.selected) {
            classes += " wrong";
          }
          return "<button class='" + classes + "' type='button' data-answer='" + index + "'" +
            (quiz.answered ? " disabled" : "") + "><span class='answer-letter'>" + letters[index] +
            "</span><span>" + escapeHtml(answer) + "</span></button>";
        }).join("");
        var progress = (quiz.index + (quiz.answered ? 1 : 0)) / questions.length * 100;
        els.quizProgress.style.width = progress + "%";
        els.quizProgressTrack.setAttribute("aria-valuenow", String(Math.round(progress)));
        if (quiz.answered) {
          var correct = quiz.selected === question.correct;
          els.quizFeedback.className = "quiz-feedback " + (correct ? "success" : "error");
          els.quizFeedback.textContent = (correct ? "Richtig. " : "Noch nicht. ") + question.explanation;
          els.nextQuestion.disabled = false;
          els.nextQuestion.textContent = quiz.index === questions.length - 1 ? "Neue Quizrunde" : "Nächste Frage";
        } else {
          els.quizFeedback.className = "quiz-feedback";
          els.quizFeedback.textContent = understanding ?
            "Beobachte die Diagramme oder sage den neuen Fall voraus. Danach folgt die Erklärung." :
            "Wähle das passende Ergebnis. Danach folgt der Rechenweg.";
          els.nextQuestion.disabled = true;
          els.nextQuestion.textContent = "Nächste Frage";
        }
      }

      function answerQuiz(index) {
        var quiz = currentQuizState();
        if (quiz.answered) {
          return;
        }
        var question = currentQuestions()[quiz.index];
        quiz.selected = index;
        quiz.answered = true;
        if (index === question.correct) {
          quiz.score += 1;
        }
        renderQuiz();
        els.nextQuestion.focus();
      }

      function nextQuizQuestion() {
        var questions = currentQuestions();
        var quiz = currentQuizState();
        if (!quiz.answered) {
          return;
        }
        if (quiz.index >= questions.length - 1) {
          resetQuiz(state.mode, state.quizType);
        } else {
          quiz.index += 1;
          quiz.answered = false;
          quiz.selected = -1;
        }
        renderQuiz();
        var firstAnswer = els.quizAnswers.querySelector("[data-answer]");
        if (firstAnswer) {
          firstAnswer.focus();
        }
      }

      function updateTransport() {
        var max = currentProfile().tMax;
        var hasEnded;
        state.time = clamp(state.time, 0, max);
        hasEnded = !state.playing && state.time >= max - 0.0001;
        els.timeSlider.max = max;
        els.timeSlider.value = state.time;
        els.timeOutput.textContent = fmt(state.time) + " s";
        els.playIcon.textContent = state.playing ? "❚❚" : hasEnded ? "↻" : "▶";
        els.playLabel.textContent = state.playing ? "Pause" : hasEnded ? "Erneut" : "Start";
        els.playButton.setAttribute(
          "aria-label",
          state.playing ? "Simulation pausieren" : hasEnded ? "Simulation erneut starten" : "Simulation starten"
        );
      }

      function renderDynamic() {
        updateTransport();
        updateSceneHint();
        drawStage();
        renderMetrics();
        updatePlotCursors();
        updateComparisonControls();
      }

      function animationFrame(timestamp) {
        if (!state.playing) {
          return;
        }
        var delta = Math.min(0.08, Math.max(0, (timestamp - state.lastFrame) / 1000));
        state.lastFrame = timestamp;
        state.time += delta * state.playback;
        if (state.time >= currentProfile().tMax) {
          state.time = currentProfile().tMax;
          pauseSimulation();
          els.simulationStatus.textContent = "Simulation beendet.";
          renderDynamic();
          return;
        }
        if (timestamp - state.lastPaint >= 30) {
          state.lastPaint = timestamp;
          renderDynamic();
        }
        state.raf = window.requestAnimationFrame(animationFrame);
      }

      function startSimulation() {
        if (state.playing) {
          return;
        }
        if (state.time >= currentProfile().tMax - 0.0001) {
          state.time = 0;
          renderDynamic();
        }
        state.playing = true;
        state.lastFrame = performance.now();
        state.lastPaint = 0;
        els.simulationStatus.textContent = "Simulation gestartet.";
        updateTransport();
        state.raf = window.requestAnimationFrame(animationFrame);
      }

      function pauseSimulation() {
        state.playing = false;
        if (state.raf) {
          window.cancelAnimationFrame(state.raf);
          state.raf = 0;
        }
        updateTransport();
      }

      function toggleSimulation() {
        if (state.playing) {
          pauseSimulation();
          els.simulationStatus.textContent = "Simulation pausiert.";
        } else {
          startSimulation();
        }
      }

      function resetSimulation() {
        pauseSimulation();
        state.time = 0;
        els.simulationStatus.textContent = "Simulation zurückgesetzt.";
        renderDynamic();
      }

      function bindEvents() {
        if (els.analysisToggle) {
          els.analysisToggle.addEventListener("click", toggleAnalysisHelpers);
        }
        if (els.comparisonSave) {
          els.comparisonSave.addEventListener("click", saveComparisonMeasurement);
        }
        if (els.comparisonDelete) {
          els.comparisonDelete.addEventListener("click", deleteComparisonMeasurement);
        }
        if (els.scaleReset) {
          els.scaleReset.addEventListener("click", resetCurrentScale);
        }
        els.levelPicker.addEventListener("click", function (event) {
          var button = event.target.closest("[data-mode]");
          if (button) {
            selectMode(button.getAttribute("data-mode"));
          }
        });

        els.levelPicker.addEventListener("keydown", function (event) {
          if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].indexOf(event.key) === -1) {
            return;
          }
          var buttons = Array.from(els.levelPicker.querySelectorAll("[data-mode]"));
          var current = event.target.closest("[data-mode]");
          if (!current) {
            return;
          }
          event.preventDefault();
          var index = buttons.indexOf(current);
          if (event.key === "Home") {
            index = 0;
          } else if (event.key === "End") {
            index = buttons.length - 1;
          } else {
            var direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
            index = (index + direction + buttons.length) % buttons.length;
          }
          selectMode(buttons[index].getAttribute("data-mode"));
          buttons[index].focus();
        });

        els.controlsBody.addEventListener("input", function (event) {
          if (event.target.matches("[data-value-key]")) {
            applyControlInput(event.target, false);
          }
        });

        els.controlsBody.addEventListener("change", function (event) {
          if (event.target.matches("[data-value-key]")) {
            applyControlInput(event.target, true);
          }
        });

        els.controlsBody.addEventListener("click", function (event) {
          var meetingButton = event.target.closest("#meetingToggle");
          if (meetingButton) {
            toggleMeetingResult();
            return;
          }
          var button = event.target.closest("[data-preset]");
          if (button) {
            applyPreset(button.getAttribute("data-preset"));
          }
        });

        els.playButton.addEventListener("click", toggleSimulation);
        els.resetButton.addEventListener("click", resetSimulation);
        els.stepButton.addEventListener("click", function () {
          pauseSimulation();
          state.time = clamp(state.time + 0.5, 0, currentProfile().tMax);
          renderDynamic();
        });
        els.timeSlider.addEventListener("input", function () {
          var requestedTime = finite(Number(els.timeSlider.value), 0);
          pauseSimulation();
          state.time = requestedTime;
          renderDynamic();
        });
        els.speedSelect.addEventListener("change", function () {
          state.playback = finite(Number(els.speedSelect.value), 1);
        });

        els.quizTypePicker.addEventListener("click", function (event) {
          var button = event.target.closest("[data-quiz-type]");
          if (!button) {
            return;
          }
          state.quizType = button.getAttribute("data-quiz-type");
          renderQuiz();
          if (els.quizBody) {
            els.quizBody.scrollTop = 0;
          }
          button.focus();
        });

        els.quizAnswers.addEventListener("click", function (event) {
          var button = event.target.closest("[data-answer]");
          if (button) {
            answerQuiz(Number(button.getAttribute("data-answer")));
          }
        });
        els.nextQuestion.addEventListener("click", nextQuizQuestion);

        window.addEventListener("resize", function () {
          if (resizeFrame) {
            window.cancelAnimationFrame(resizeFrame);
          }
          resizeFrame = window.requestAnimationFrame(function () {
            resizeFrame = 0;
            plotCaches = {};
            stageDomainCache = null;
            revealActiveLevel();
            renderDynamic();
          });
        });

        document.addEventListener("visibilitychange", function () {
          if (document.hidden && state.playing) {
            pauseSimulation();
          }
        });
      }

      setupAnalysisControls();
      setupBackLink();
      bindEvents();
      document.querySelectorAll(".level-button").forEach(function (button) {
        var active = button.getAttribute("data-mode") === state.mode;
        button.setAttribute("aria-checked", active ? "true" : "false");
        button.tabIndex = active ? 0 : -1;
      });
      renderMode();
    }());
