/*
 * Configuration parameters
 */

var selectedN; // stores the N value selected
var selectedK; // stores the K value selected
var selectedL; // stores the L value selected
var selectedB; // stores the B value selected
var selectedA; // stores the A value selected
var selectedSecondaryMetricCount; // stores the right-side metric target selected
var selectedSecondaryMetricType = "exchanges"; // stores the right-side metric type selected
var selectedIngestionDatasetType = "kl"; // stores which dataset is inserted into selected indexes
var selectedIndexStructure1 = "SWARE";
var selectedIndexStructure2 = "QuIT";

var wait = 3;                    // how many iterations we wait before we show index for SWARE algorithm
var total_data = [];            // stores the workload data
var running = true;             // flag to check if animation is running
const BASE_ANIMATION_DELAY = 1000;
var delay = BASE_ANIMATION_DELAY; // delay between animations
const MIN_ELEMENT_COUNT = 20;
const MAX_ELEMENT_COUNT = 50000;
const MIN_PERCENT_VALUE = 0;
const MAX_PERCENT_VALUE = 100;
const MIN_DISTRIBUTION_PARAMETER_VALUE = 0;

/* Parameters for the SWARE algorithm */

let sware_data = [];
let tail_data = [];
let lil_data = [];
let bplus_data = [];

const STRUCTURE_PANEL_IDS = {
    SWARE: "structure-panel-sware",
    QuIT: "structure-panel-quit",
    Tail: "structure-panel-tail",
    lil: "structure-panel-lil",
    BPlusTree: "structure-panel-bplus"
};

const STRUCTURE_BOX_IDS = {
    SWARE: "sware-box",
    QuIT: "quit-box",
    Tail: "tail-box",
    lil: "lil-box",
    BPlusTree: "bplus-box"
};

/* Parameters for the QuIT algorithm */

var leaf_node_size = 10;     // size of the leaf node
var pole = [];                // current pole
var pole_prev = [];           // previous pole
let pole_next = [];           // next pole


/* Parameters for the charts */
var sware_sorts = 0;
var sware_sorts_history = [];
var sware_flushes = 0;
var sware_flushes_history = [];
var pages_flushed;
var total_pages_flushed = 0;
var sware_average_pages_per_flush = 0;
var sware_average_pages_per_flush_history = [];
var sware_bulk_loads = 0;
var sware_bulk_loads_history = [];
var sware_top_inserts = 0;
var sware_top_inserts_history = [];
var quit_fast_inserts = 0;
var quit_fast_inserts_history = [];
var quit_top_inserts = 0;
var quit_top_inserts_history = [];
var quit_pole_resets = 0;
var quit_pole_resets_history = [];
var swareComparisonPreview = null;
var comparisonChartHistory = null;
var secondaryMetricDatasets = [];
var klDatasets = [];
let quit_leaf_dict = [];

const STRUCTURE_CHART_COLORS = {
    SWARE: "#80CBC4",
    QuIT: "#FFB433",
    Tail: "#5b8ecb",
    lil: "#d96c6c",
    BPlusTree: "#8b6a42"
};

/**
 * Apply the redesign plotting theme to a Plotly layout object.
 * This merges a small set of visual defaults (transparent paper, subtle plot bg,
 * colorway from STRUCTURE_CHART_COLORS, font color/family, and legend styling)
 * while preserving any layout properties already provided by the caller.
 */
function applyRedesignPlotlyLayout(layout) {
    const colorway = Object.values(STRUCTURE_CHART_COLORS || {});
    const theme = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(255,255,255,0.02)',
        colorway: colorway.length ? colorway : undefined,
        font: Object.assign({ family: 'DM Sans, Arial, sans-serif', color: '#222' }, (layout && layout.font) || {}),
        hoverlabel: Object.assign({ bgcolor: '#ffffff', bordercolor: 'rgba(0,0,0,0.06)', font: { color: '#111' } }, (layout && layout.hoverlabel) || {}),
        xaxis: Object.assign({ showgrid: true, gridcolor: 'rgba(0,0,0,0.04)', zerolinecolor: 'rgba(0,0,0,0.06)', linecolor: 'rgba(0,0,0,0.12)', tickfont: { size: 11, color: '#666' } }, (layout && layout.xaxis) || {}),
        yaxis: Object.assign({ showgrid: true, gridcolor: 'rgba(0,0,0,0.04)', zerolinecolor: 'rgba(0,0,0,0.06)', linecolor: 'rgba(0,0,0,0.12)', tickfont: { size: 11, color: '#666' } }, (layout && layout.yaxis) || {}),
    };

    // Merge title font color if a title exists
    if (layout && layout.title) {
        theme.title = Object.assign({}, layout.title, {
            font: Object.assign({ color: '#111' }, (layout.title && layout.title.font) || {})
        });
    }

    const merged = Object.assign({}, layout, theme);

    // Force legend placement and styling so it is centered above the plot area.
    // Use explicit assignment so any per-chart legend settings don't override centering.
    merged.legend = Object.assign({}, merged.legend || {}, {
        bgcolor: 'rgba(255,255,255,0.0)',
        borderwidth: 0,
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: 1.02,
        yanchor: 'bottom',
        font: { family: 'IBM Plex Mono, monospace', size: 12, color: '#1c1c1a' }
    });

    // Ensure there's enough top margin for the legend so it visually centers inside the card
    merged.margin = merged.margin || {};
    const MIN_TOP_MARGIN = 56;
    merged.margin.t = Math.max(merged.margin.t || 0, MIN_TOP_MARGIN);

    return merged;
}

// Ensure Plotly charts resize when the window changes size. Use a single listener
// that attempts to resize all known chart divs created by this file.
window.addEventListener('resize', () => {
    try {
        const chartNodes = document.querySelectorAll('[id^="chart_div"], [id^="inversion_chart_div"]');
        chartNodes.forEach((node) => {
            if (typeof Plotly !== 'undefined' && node && node.nodeType === 1) {
                try { Plotly.Plots.resize(node); } catch (e) { /* ignore individual failures */ }
            }
        });
    } catch (e) {
        // ignore
    }
});

// array that holds the field user inputted
// order is [n, metricCount, metricType]
var inputtedSecondaryMetricData = [];
var inputedDatakl = [];


//trees
let quitTree = new QuIT(10);
let lilTree = new LilTree(10);
let tailTree = new Tail(10);
let bPlusTree = new BTree(10);
let swareTree = new Sware(10);
let nextStepInProgress = false;
let fastForwardInProgress = false;
let animationIntervalId = null;

function readSelectedIndexStructures() {
    const firstSelect = document.getElementById('cmp-select-index-1');
    const secondSelect = document.getElementById('cmp-select-index-2');
    selectedIndexStructure1 = firstSelect ? firstSelect.value : "SWARE";
    selectedIndexStructure2 = secondSelect ? secondSelect.value : "QuIT";
}

function readSelectedSecondaryMetricType() {
    const metricSelect = document.getElementById('cmp-select-secondary-metric');
    selectedSecondaryMetricType = metricSelect ? metricSelect.value : "exchanges";
}

function readSelectedIngestionDatasetType() {
    const ingestionDatasetSelect = document.getElementById('cmp-select-ingestion-dataset');
    selectedIngestionDatasetType = ingestionDatasetSelect ? ingestionDatasetSelect.value : "kl";
}

function getSecondaryMetricLabel(metricType) {
    return metricType === "inversions" ? "Inversions" : "Exchanges";
}

function getSecondaryMetricShortLabel(metricType) {
    return metricType === "inversions" ? "I" : "E";
}

function updateSecondaryMetricChartTitle() {
    const titleElement = document.getElementById('secondary-metric-title');
    if (titleElement) {
        titleElement.textContent = getSecondaryMetricLabel(selectedSecondaryMetricType);
    }
}

function getNumericInputValue(inputId) {
    const input = document.getElementById(inputId);
    if (!input || input.value.trim() === "") {
        return NaN;
    }
    return Number(input.value);
}

function readSelectedWorkloadParameters() {
    selectedN = getNumericInputValue('cmp-select-N');
    selectedK = getNumericInputValue('cmp-select-K');
    selectedL = getNumericInputValue('cmp-select-L');
    selectedB = getNumericInputValue('cmp-select-B');
    selectedA = getNumericInputValue('cmp-select-A');
}

function abortActiveAnimation() {
    running = false;
    nextStepInProgress = false;
    if (animationIntervalId != null) {
        clearInterval(animationIntervalId);
        animationIntervalId = null;
    }
}

function validateWorkloadParameters() {
    if (!Number.isInteger(selectedN)) {
        alert("N should be an integer");
        return false;
    } else if (selectedN < MIN_ELEMENT_COUNT || selectedN > MAX_ELEMENT_COUNT) {
        alert("N should be between " + MIN_ELEMENT_COUNT + " and " + MAX_ELEMENT_COUNT);
        return false;
    }

    if (!Number.isFinite(selectedK)) {
        alert("K should be a number");
        return false;
    } else if (selectedK < MIN_PERCENT_VALUE || selectedK > MAX_PERCENT_VALUE) {
        alert("K should be between " + MIN_PERCENT_VALUE + " and " + MAX_PERCENT_VALUE);
        return false;
    }

    if (!Number.isFinite(selectedL)) {
        alert("L should be a number");
        return false;
    } else if (selectedL < MIN_PERCENT_VALUE || selectedL > MAX_PERCENT_VALUE) {
        alert("L should be between " + MIN_PERCENT_VALUE + " and " + MAX_PERCENT_VALUE);
        return false;
    }

    if (!Number.isFinite(selectedA)) {
        alert("Alpha should be a number");
        return false;
    } else if (selectedA < MIN_DISTRIBUTION_PARAMETER_VALUE) {
        alert("Alpha should be non-negative");
        return false;
    }

    if (!Number.isFinite(selectedB)) {
        alert("Beta should be a number");
        return false;
    } else if (selectedB < MIN_DISTRIBUTION_PARAMETER_VALUE) {
        alert("Beta should be non-negative");
        return false;
    }

    return true;
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
        readSelectedSecondaryMetricType();
        readSelectedIngestionDatasetType();
        updateSecondaryMetricChartTitle();
    });
} else {
    readSelectedSecondaryMetricType();
    readSelectedIngestionDatasetType();
    updateSecondaryMetricChartTitle();
}

function getMaximumSecondaryMetricCount(metricType, n) {
    if (metricType === "inversions") {
        return Math.floor((n * (n - 1)) / 2);
    }
    return Math.max(0, n - 1);
}

function clampSecondaryMetricCount(metricType, n, metricCount) {
    const normalizedMetricCount = Math.floor(metricCount);
    return Math.max(0, Math.min(normalizedMetricCount, getMaximumSecondaryMetricCount(metricType, n)));
}

function generateSelectedIngestionDataset(klDataset, kElementCount)
{
    if (selectedIngestionDatasetType === "exchanges" || selectedIngestionDatasetType === "inversions") {
        const metricCount = clampSecondaryMetricCount(
            selectedIngestionDatasetType,
            selectedN,
            getSecondaryMetricTargetCount(selectedIngestionDatasetType, klDataset, kElementCount)
        );
        return generateSecondaryMetricDataset(selectedIngestionDatasetType, selectedN, metricCount);
    }

    return klDataset;
}

function getSelectedStructureNames()
{
    return [selectedIndexStructure1, selectedIndexStructure2];
}

function validateSelectedStructures()
{
    if (selectedIndexStructure1 === selectedIndexStructure2) {
        alert("Please select two different index structures.");
        return false;
    }
    return true;
}

function returnStructurePanelsToStore()
{
    const panelStore = document.getElementById("structure-panel-store");
    if (!panelStore) {
        return;
    }

    for (const panelId of Object.values(STRUCTURE_PANEL_IDS)) {
        const panel = document.getElementById(panelId);
        if (panel && panel.parentElement !== panelStore) {
            panelStore.appendChild(panel);
        }
    }
}

function mountSelectedStructurePanels()
{
    const leftSlot = document.getElementById("buffer-area");
    const rightSlot = document.getElementById("quit-area");
    if (!leftSlot || !rightSlot) {
        return;
    }

    returnStructurePanelsToStore();
    const [leftStructure, rightStructure] = getSelectedStructureNames();
    const leftPanel = document.getElementById(STRUCTURE_PANEL_IDS[leftStructure]);
    const rightPanel = document.getElementById(STRUCTURE_PANEL_IDS[rightStructure]);

    if (leftPanel) {
        leftSlot.appendChild(leftPanel);
    }
    if (rightPanel) {
        rightSlot.appendChild(rightPanel);
    }
}

function showSelectedStructureSlots()
{
    const leftSlot = document.getElementById("buffer-area");
    const rightSlot = document.getElementById("quit-area");
    if (leftSlot) {
        leftSlot.classList.remove("hidden");
    }
    if (rightSlot) {
        rightSlot.classList.remove("hidden");
    }
}

function initializeSelectedStructureVisuals()
{
    const uniqueStructures = Array.from(new Set(getSelectedStructureNames()));
    for (const structureName of uniqueStructures) {
        if (structureName === "SWARE") {
            initializeSwareVisualization();
        }
        else if (structureName === "QuIT") {
            initializeQuitVisualization();
        }
        else if (structureName === "Tail") {
            initializeTailVisualization();
        }
        else if (structureName === "lil") {
            initializeLilVisualization();
        }
        else if (structureName === "BPlusTree") {
            initializeBPlusVisualization();
        }
    }
}

function getStructureDataLength(structureName)
{
    if (structureName === "SWARE") {
        return sware_data.length;
    }
    if (structureName === "Tail") {
        return tail_data.length;
    }
    if (structureName === "lil") {
        return lil_data.length;
    }
    if (structureName === "BPlusTree") {
        return bplus_data.length;
    }
    if (structureName === "QuIT") {
        return total_data.length;
    }
    return 0;
}

function getStructurePhaseRunner(structureName)
{
    if (structureName === "SWARE") {
        return animateSwarePhase;
    }
    if (structureName === "QuIT") {
        return runQuitPhase;
    }
    if (structureName === "Tail") {
        return runTailPhase;
    }
    if (structureName === "lil") {
        return runLilPhase;
    }
    if (structureName === "BPlusTree") {
        return runBPlusPhase;
    }
    return null;
}

function getStructureBoxId(structureName)
{
    return STRUCTURE_BOX_IDS[structureName] || null;
}

function shouldShowResultsPanels()
{
    const selectedStructures = new Set(getSelectedStructureNames());
    return selectedStructures.size === 2 &&
        selectedStructures.has("SWARE") &&
        selectedStructures.has("QuIT");
}

function getStructureExecutionOrder()
{
    const selectedStructures = getSelectedStructureNames();
    if (!selectedStructures.includes("QuIT")) {
        return selectedStructures.slice();
    }

    const nonQuitStructures = selectedStructures.filter((name) => name !== "QuIT");
    if (nonQuitStructures.length === 0) {
        return selectedStructures.slice();
    }
    return nonQuitStructures.concat("QuIT");
}

function resetComparisonMetrics()
{
    sware_sorts = 0;
    sware_sorts_history = [];
    sware_flushes = 0;
    sware_flushes_history = [];
    pages_flushed = 0;
    total_pages_flushed = 0;
    sware_average_pages_per_flush = 0;
    sware_average_pages_per_flush_history = [];
    sware_bulk_loads = 0;
    sware_bulk_loads_history = [];
    sware_top_inserts = 0;
    sware_top_inserts_history = [];
    quit_fast_inserts = 0;
    quit_fast_inserts_history = [];
    quit_top_inserts = 0;
    quit_top_inserts_history = [];
    quit_pole_resets = 0;
    quit_pole_resets_history = [];
    swareComparisonPreview = null;
    comparisonChartHistory = null;
}

function getChartMetricValue(metricValue)
{
    return typeof metricValue === "number" ? metricValue : 0;
}

function initializeComparisonChartHistory()
{
    const selectedStructures = getSelectedStructureNames();
    comparisonChartHistory = {
        leftName: selectedStructures[0],
        rightName: selectedStructures[1],
        topInsertsLeft: [],
        topInsertsRight: [],
        fastInsertsLeft: [],
        fastInsertsRight: [],
        fastPathResetsLeft: [],
        fastPathResetsRight: []
    };
}

function syncSelectedStructureChartHistory()
{
    if (!comparisonChartHistory || typeof getComparisonMetricsByStructure !== "function") {
        return;
    }

    const metrics = getComparisonMetricsByStructure();
    const leftMetrics = metrics[comparisonChartHistory.leftName] || null;
    const rightMetrics = metrics[comparisonChartHistory.rightName] || null;

    comparisonChartHistory.topInsertsLeft.push(getChartMetricValue(leftMetrics ? leftMetrics.topInserts : null));
    comparisonChartHistory.topInsertsRight.push(getChartMetricValue(rightMetrics ? rightMetrics.topInserts : null));
    comparisonChartHistory.fastInsertsLeft.push(getChartMetricValue(leftMetrics ? leftMetrics.fastInserts : null));
    comparisonChartHistory.fastInsertsRight.push(getChartMetricValue(rightMetrics ? rightMetrics.fastInserts : null));
    comparisonChartHistory.fastPathResetsLeft.push(getChartMetricValue(leftMetrics ? leftMetrics.fastPathResets : null));
    comparisonChartHistory.fastPathResetsRight.push(getChartMetricValue(rightMetrics ? rightMetrics.fastPathResets : null));
}

function fastForwardStructureInsert(structureName)
{
    if (structureName === "SWARE") {
        return sware();
    }
    if (structureName === "Tail" && Array.isArray(tail_data) && tail_data.length > 0) {
        tailTree.insert(tail_data[0]);
        tail_data.shift();
        return true;
    }
    if (structureName === "lil" && Array.isArray(lil_data) && lil_data.length > 0) {
        lilTree.insert(lil_data[0]);
        lil_data.shift();
        return true;
    }
    if (structureName === "BPlusTree" && Array.isArray(bplus_data) && bplus_data.length > 0) {
        bPlusTree.insert(bplus_data[0]);
        bplus_data.shift();
        return true;
    }
    if (structureName === "QuIT" && Array.isArray(total_data) && total_data.length > 0) {
        quitTree.insert(total_data[0]);
        total_data.shift();
        return true;
    }
    return null;
}

function refreshSelectedStructureViews()
{
    initializeSelectedStructureVisuals();
    updateInsertionsPanel(false);
}

function waitForStepToFinish()
{
    if (!nextStepInProgress) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        const poll = () => {
            if (!nextStepInProgress) {
                resolve();
                return;
            }
            requestAnimationFrame(poll);
        };
        poll();
    });
}

async function fast_forward_button(stepCount)
{
    if (fastForwardInProgress || !Number.isInteger(stepCount) || stepCount <= 0 || total_data.length === 0) {
        return;
    }

    const wasRunning = running;
    fastForwardInProgress = true;
    running = false;
    if (animationIntervalId != null) {
        clearInterval(animationIntervalId);
        animationIntervalId = null;
    }
    await waitForStepToFinish();
    nextStepInProgress = true;

    try {
        const selectedStructures = getSelectedStructureNames();
        if (selectedStructures.some((structureName) => getStructureDataLength(structureName) === 0)) {
            return;
        }
        const executionOrder = getStructureExecutionOrder();
        const iterations = Math.min(stepCount, total_data.length);

        for (let i = 0; i < iterations && total_data.length > 0; i++) {
            if (selectedStructures.some((structureName) => getStructureDataLength(structureName) === 0)) {
                break;
            }
            let insertedQuit = false;

            for (const structureName of executionOrder) {
                const result = fastForwardStructureInsert(structureName);
                if (structureName === "QuIT" && result) {
                    insertedQuit = true;
                }
            }

            if (!insertedQuit) {
                total_data.shift();
            }

            clearSwareComparisonPreview();
            syncSelectedStructureChartHistory();
        }

        if (total_data.length === 0) {
            running = false;
        }
        refreshSelectedStructureViews();
        update_table();
        update_charts();
    }
    finally {
        nextStepInProgress = false;
        fastForwardInProgress = false;
    }

    if (total_data.length === 0) {
        stop_button();
    }
    else if (wasRunning) {
        continue_button();
    }
    else {
        stop_button();
    }
}

function setSwareComparisonPreview(preview)
{
    swareComparisonPreview = preview;
    if (typeof update_table === "function") {
        update_table();
    }
}

function clearSwareComparisonPreview()
{
    swareComparisonPreview = null;
}

function getSwareTracePageCount(trace)
{
    if (!trace || !Array.isArray(trace.flushEvents)) {
        return 0;
    }

    const pageIndexes = new Set();
    for (const event of trace.flushEvents) {
        if (event && Number.isInteger(event.pageIndex)) {
            pageIndexes.add(event.pageIndex);
        }
    }
    return pageIndexes.size;
}

function syncComparisonMetrics(swareTrace)
{
    if (!shouldShowResultsPanels()) {
        return;
    }

    const previousFlushes = sware_flushes;
    sware_flushes = swareTree && typeof swareTree.bufferFlushes === "number"
        ? swareTree.bufferFlushes
        : sware_flushes;
    sware_sorts = sware_flushes;

    if (swareTrace && swareTrace.bufferWasFull && sware_flushes > previousFlushes) {
        pages_flushed = getSwareTracePageCount(swareTrace);
        total_pages_flushed += pages_flushed;
    }

    sware_average_pages_per_flush = sware_flushes > 0
        ? total_pages_flushed / sware_flushes
        : 0;
    sware_bulk_loads = swareTree && typeof swareTree.fastInserts === "number"
        ? swareTree.fastInserts
        : sware_bulk_loads;
    sware_top_inserts = swareTree && typeof swareTree.topInserts === "number"
        ? swareTree.topInserts
        : sware_top_inserts;

    quit_fast_inserts = quitTree ? quitTree.fastInserts : 0;
    quit_top_inserts = quitTree ? (quitTree.size - quitTree.fastInserts) : 0;
    quit_pole_resets = quitTree ? quitTree.poleResets : 0;

    sware_sorts_history.push(sware_sorts);
    sware_flushes_history.push(sware_flushes);
    sware_average_pages_per_flush_history.push(sware_average_pages_per_flush);
    sware_bulk_loads_history.push(sware_bulk_loads);
    sware_top_inserts_history.push(sware_top_inserts);
}

/*
 * Gets called after "Generate Workload" button is clicked
 */
function visualize_workload() {
    console.log("Visualising workload:");

    // Get the inputs
    readSelectedWorkloadParameters();
    readSelectedIndexStructures();
    readSelectedSecondaryMetricType();
    // selectedSecondaryMetricCount = parseInt(document.getElementById('cmp-select-E').value);

    let flag = validateWorkloadParameters(); // flag to generate graph when parameters are acceptable

    // Show the inputs in console
    console.log("Input N:", selectedN);
    console.log("Input K:", selectedK);
    console.log("Input L:", selectedL);
    console.log("Input A:", selectedA);
    console.log("Input B:", selectedB);

    /*
    if (isNaN(selectedSecondaryMetricCount) || selectedSecondaryMetricCount !== parseInt(selectedSecondaryMetricCount)) {
        alert("E should be an integer");
        flag = false;
    }
    // verification to make sure data generation won't break
    if (flag) {
        if (selectedSecondaryMetricCount > (selectedN / 2)) {
            alert("Exchange value is too large for the N value");
            flag = false;
        }
    }
    */

    // If all parameters are valid, generate the visualization
    if (flag) {
        console.log("All parameters valid, generating visualization.");
        updateSecondaryMetricChartTitle();

        // Show chart elements
        document.getElementById('chart-column').classList.remove('hidden');

        // Get the data from the imitated server
        running = true;
        const selectedKElementCount = Math.round((selectedN * selectedK) / 100);
        total_data = generate(selectedKElementCount, Math.round(selectedN * selectedL / 100),
            selectedN, selectedB, selectedA);
        selectedSecondaryMetricCount = clampSecondaryMetricCount(
            selectedSecondaryMetricType,
            selectedN,
            getSecondaryMetricTargetCount(selectedSecondaryMetricType, total_data, selectedKElementCount)
        );
        var klParameters = [selectedN, selectedK, selectedL, selectedB, selectedSecondaryMetricCount, selectedA];
        var secondaryMetricParameters = [selectedN, selectedSecondaryMetricCount, selectedSecondaryMetricType];
        inputtedSecondaryMetricData.push(secondaryMetricParameters);
        inputedDatakl.push(klParameters);
        klDatasets.push(total_data);
        const secondaryMetricDataset = generateSecondaryMetricDataset(
            selectedSecondaryMetricType,
            selectedN,
            selectedSecondaryMetricCount
        );
        secondaryMetricDatasets.push(secondaryMetricDataset);

        // Draw charts
        const tickCount = 10;

        // Google charts uses the upper bound when generating 
        // ticks. This function manually creates the ticks 
        // using N.
        function createTicks(selectedN) {
            let tickArr = [];
            tickArr.push(0);
            let n = Math.round(selectedN / tickCount);
            for (let i = n; i < selectedN; i += n) {
                tickArr.push(i);
            }
            tickArr.push(selectedN);
            return tickArr;
        }

        let graphCount;
        // remove previously drawn graphs and redraw them all
        document.getElementById("klCharts").innerHTML = '';
        document.getElementById("inversionCharts").innerHTML = '';
        // Force button visibility
        document.getElementById('chart-column').classList.remove('hidden');
        let runBtn;
        
        //draw kl charts most recently created chart is drawn first
        for (let i = klDatasets.length - 1; i >= 0; i--) {
            // Adjust data for plotting, k-l data
            var plot_data = adjust_for_plotly_plotting(klDatasets[i]);
            // Options for the graph
            const layout = {
                width: 425,
                height: 450,
                margin: {
                    l: 60,
                    r: 40,
                    t: 36,
                    b: 60
                },
                xaxis: {
                    title: 'position',
                    range: [0, null],
                    automargin: true
                },
                yaxis: {
                    title: 'value',
                    range: [0, null],
                    automargin: true
                },
                legend: {
                    orientation: 'h',
                    x: 0.2,
                    y: 1.05,
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    bordercolor: 'black',
                    borderwidth: 0
                },
                showlegend: true,
                annotations: [{
                    text: "(N=" + inputedDatakl[i][0] + ", K=" + inputedDatakl[i][1]
                        + ", L=" + inputedDatakl[i][2] + ", B=" + inputedDatakl[i][3] + ", A=" + inputedDatakl[i][5] + ")",
                    xref: 'paper',
                    yref: 'paper',
                    x: 0.5,
                    y: -0.15,
                    xanchor: 'center',
                    yanchor: 'top',
                    showarrow: false,
                    font: {
                        size: 14,
                        family: 'Arial'
                    }
                }]
            };
            
            const config = {
                responsive: true         // Enable responsive behavior
            };

            // Draw the charts
            let deleteButton = document.createElement("button");
            deleteButton.classList.add("deleteButton");
            deleteButton.textContent = "✖";
            deleteButton.onclick = function() {
                let wrapper = deleteButton.parentNode;
                klDatasets.splice(parseInt(wrapper.id), 1);
                inputedDatakl.splice(parseInt(wrapper.id), 1);
                wrapper.remove();
            };
            let klChartWrapper = document.createElement("div");
            klChartWrapper.style.position = "relative";
            klChartWrapper.id = i;
            let klChart = document.createElement("div");
            klChart.id = "chart_div" + i;
            klChart.classList.add("equal-height", "chart_div");
            klChart.style.width = "425px";
            klChart.style.height = "450px";
            klChart.style.minHeight = "450px";
            klChart.style.padding = "0px";
            klChartWrapper.appendChild(klChart);
            document.getElementById("klCharts").appendChild(klChartWrapper);
            // Ensure layout doesn't render the old annotation under the x-axis
            if (layout && layout.annotations) {
                layout.annotations = [];
            }

            // Diagnostics: log plot_data summary so we can debug empty charts
            try {
                const t0 = plot_data[0] || {};
                console.log('Plot KL i=', i, 'traces=', plot_data.length, 'trace0-xlen=', (t0.x && t0.x.length) || 0, 'sample x0..4=', (t0.x? t0.x.slice(0,5):[]), 'sample y0..4=', (t0.y? t0.y.slice(0,5):[]));
            } catch(e) {}

            // Normalize traces for consistent styling: marker size/opacity and line width
            try {
                plot_data.forEach(function(trace){
                    trace.marker = trace.marker || {};
                    if (!trace.marker.size) trace.marker.size = 6;
                    if (typeof trace.marker.opacity === 'undefined') trace.marker.opacity = 0.85;
                    // preserve existing trace colors (do not override marker.color here)
                    // line styling
                    if (trace.line) {
                        trace.line.width = trace.line.width || 1.5;
                        trace.line.color = trace.line.color || trace.marker.color;
                    }
                });
            } catch(e) { /* safe-guard */ }

            Plotly.newPlot("chart_div" + i, plot_data, applyRedesignPlotlyLayout(layout), config);
            klChartWrapper.appendChild(deleteButton);
        }
        
        // draw secondary-metric charts, most recently created chart is drawn first
        for (let i = secondaryMetricDatasets.length - 1; i >= 0; i--) {
            // Adjust data for plotting, k-l data
            var plot_data = adjust_for_plotly_plotting(secondaryMetricDatasets[i]);
            const metricParameters = inputtedSecondaryMetricData[i];
            // Options for the graph
            const layout = {
                //autosize:true,
                width: 425,
                height: 450,
                margin: {
                    l: 60,
                    r: 40,
                    t: 36,
                    b: 60
                },
                xaxis: {
                    title: 'position',
                    //scaleanchor:'y',
                    //scaleratio:0.3,
                    range: [0, null],
                    automargin: true
                },
                yaxis: {
                    title: 'value',
                    range: [0, null],
                    automargin: true
                },
                legend: {
                    x: 0.2,
                    y: 1.05,
                    orientation: 'h',
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    bordercolor: 'black',
                    borderwidth: 0
                },
                showlegend: true,
                annotations: [{
                    text: "(N=" + metricParameters[0] + ", "
                        + getSecondaryMetricShortLabel(metricParameters[2]) + "=" + metricParameters[1] + ")",
                    xref: 'paper',
                    yref: 'paper',
                    x: 0.5,
                    y: -0.15,
                    xanchor: 'center',
                    yanchor: 'top',
                    showarrow: false,
                    font: {
                        size: 14,
                        family: 'Arial'
                    }
                }]
            };

            const config = {
                responsive: true         // Enable responsive behavior
            };

            // Draw the charts
            let deleteButton = document.createElement("button");
            deleteButton.classList.add("deleteButton");
            deleteButton.textContent = "✖";
            deleteButton.onclick = function() {
                let wrapper = deleteButton.parentNode;
                secondaryMetricDatasets.splice(parseInt(wrapper.id), 1);
                inputtedSecondaryMetricData.splice(parseInt(wrapper.id), 1);
                wrapper.remove();
            };

            let secondaryMetricChartWrapper = document.createElement("div");
            secondaryMetricChartWrapper.style.position = "relative";
            secondaryMetricChartWrapper.id = i;
            let secondaryMetricChart = document.createElement("div");
            secondaryMetricChart.id = "inversion_chart_div" + i;
            secondaryMetricChart.classList.add("equal-height", "chart_div");
            secondaryMetricChart.style.width = "425px";
            secondaryMetricChart.style.height = "450px";
            secondaryMetricChart.style.minHeight = "450px";
            secondaryMetricChart.style.padding = "0px";
            secondaryMetricChartWrapper.appendChild(secondaryMetricChart);
            document.getElementById("inversionCharts").appendChild(secondaryMetricChartWrapper);
            // Ensure layout doesn't render the old annotation under the x-axis
            if (layout && layout.annotations) {
                layout.annotations = [];
            }

            // Normalize traces for consistent styling: marker size/opacity and line width
            try {
                plot_data.forEach(function(trace){
                    trace.marker = trace.marker || {};
                    if (!trace.marker.size) trace.marker.size = 6;
                    if (typeof trace.marker.opacity === 'undefined') trace.marker.opacity = 0.85;
                    // preserve existing trace colors (do not override marker.color here)
                    // line styling
                    if (trace.line) {
                        trace.line.width = trace.line.width || 1.5;
                        trace.line.color = trace.line.color || trace.marker.color;
                    }
                });
            } catch(e) { /* safe-guard */ }
            // Diagnostics: log plot_data summary so we can debug empty right-side metric charts
            try {
                const t0 = plot_data[0] || {};
                console.log('Plot secondary metric i=', i, 'traces=', plot_data.length, 'trace0-xlen=', (t0.x && t0.x.length) || 0, 'sample x0..4=', (t0.x? t0.x.slice(0,5):[]), 'sample y0..4=', (t0.y? t0.y.slice(0,5):[]));
            } catch(e) {}

            Plotly.newPlot("inversion_chart_div" + i, plot_data, applyRedesignPlotlyLayout(layout), config);
            secondaryMetricChartWrapper.appendChild(deleteButton);
        }

        // Update card subtitles with the most recent dataset info (if present)
        try {
            // K-L metric subtitle
            const klContainer = document.getElementById('klCharts');
            if (klContainer) {
                const klCard = klContainer.closest('.cc');
                if (klCard) {
                    let sub = klCard.querySelector('.cc-sub');
                    if (!sub) {
                        sub = document.createElement('div');
                        sub.className = 'cc-sub';
                        const hdr = klCard.querySelector('.cc-h');
                        if (hdr) hdr.appendChild(sub);
                    }
                    if (inputedDatakl && inputedDatakl.length > 0) {
                        const last = inputedDatakl[inputedDatakl.length - 1];
                        sub.textContent = "(N=" + last[0] + ", K=" + last[1] + ", L=" + last[2] + ", B=" + last[3] + ", A=" + last[5] + ")";
                    } else {
                        sub.textContent = '';
                    }
                }
            }

            // Secondary metric subtitle
            const invContainer = document.getElementById('inversionCharts');
            if (invContainer) {
                const invCard = invContainer.closest('.cc');
                if (invCard) {
                    let sub = invCard.querySelector('.cc-sub');
                    if (!sub) {
                        sub = document.createElement('div');
                        sub.className = 'cc-sub';
                        const hdr = invCard.querySelector('.cc-h');
                        if (hdr) hdr.appendChild(sub);
                    }
                    if (inputtedSecondaryMetricData && inputtedSecondaryMetricData.length > 0) {
                        const last = inputtedSecondaryMetricData[inputtedSecondaryMetricData.length - 1];
                        sub.textContent = "(N=" + last[0] + ", "
                            + getSecondaryMetricShortLabel(last[2]) + "=" + last[1] + ")";
                    } else {
                        sub.textContent = '';
                    }
                }
            }
        } catch (e) { /* ignore subtitle failures */ }

        document.getElementById("runBtn").classList.remove("hidden");
        document.getElementById("run-button-contain").classList.remove("hidden");

    } else {
        console.log("Invalid parameters detected, visualization aborted");
    }

    return flag;
}

/*
 * Gets called after "Run" button is clicked
 */
function run_operations() {
    readSelectedWorkloadParameters();
    readSelectedIndexStructures();
    readSelectedIngestionDatasetType();
    nextStepInProgress = false;

    let flag = validateWorkloadParameters(); // flag to generate graph when parameters are acceptable

    if (flag && !validateSelectedStructures()) {
        flag = false;
    }


    if(flag){
        if (animationIntervalId != null) {
            clearInterval(animationIntervalId);
            animationIntervalId = null;
        }
        running = true;
        delay = BASE_ANIMATION_DELAY;
        quitTree = new QuIT(10);
        swareTree = new Sware(10);
        tailTree = new Tail(10);
        lilTree = new LilTree(10);
        bPlusTree = new BTree(10);
        resetComparisonMetrics();
        const selectedKElementCount = Math.round((selectedN * selectedK) / 100);
        const klInsertionDataset = generate(
            selectedKElementCount,
            Math.round(selectedN * selectedL / 100),
            selectedN,
            selectedB,
            selectedA
        );
        total_data = generateSelectedIngestionDataset(klInsertionDataset, selectedKElementCount);
        
        sware_data = [...total_data];
        tail_data = [...total_data];
        lil_data = [...total_data];
        bplus_data = [...total_data];
        console.log("Starting to run the algorithm.");
        //pre-load
        state = 2;
        document.getElementById('animations-div').classList.remove("hidden");
        mountSelectedStructurePanels();
        showSelectedStructureSlots();
        const swareTreeArea = document.getElementById('tree-area-step-3+');
        if (swareTreeArea) {
            swareTreeArea.classList.toggle("hidden", !getSelectedStructureNames().includes("SWARE"));
        }
        initializeQuitVisualization();
        updateInsertionsPanel(false);
        initializeSelectedStructureVisuals();
        // Show hidden divs
        //document.getElementById('data-box').classList.remove('hidden');
        document.getElementById('buttons-container-wrapper').classList.remove('hidden');
        document.getElementById('dashed-line').classList.remove('hidden');
        document.getElementById('insertions-area').classList.remove("hidden");
        document.getElementById('results-panel').classList.remove("hidden");
        document.getElementById('plots').classList.remove("hidden");
        initializeComparisonChartHistory();
        if (typeof clearComparisonCharts === "function") {
            clearComparisonCharts();
        }
        if (typeof updateComparisonLegends === "function") {
            updateComparisonLegends();
        }
        if (typeof update_table === "function") {
            update_table();
        }

        document.getElementById("stop-button").disabled = false; // enable stop button
        document.getElementById("continue-button").disabled = true; // disable continue button
        const nextstepButton = document.getElementById("nextstep-button");
        if (nextstepButton) {
            nextstepButton.disabled = true;
        }

        animationIntervalId = setInterval(() => {
            if (running == false) {
                clearInterval(animationIntervalId);
                animationIntervalId = null;
                console.log('test');
                return;
            }
            next_step();
        }, delay);
        return true;
    }
    else{
        abortActiveAnimation();
        console.log('error');
        return false;
    }
}

/*
 * Runs one step of both algorithms and updates the UI
 */
function setAlgorithmBoxActive(boxId, active)
{
    const box = document.getElementById(boxId);
    if (!box) {
        return;
    }
    box.classList.toggle("algo-box-active", active);
}

function setAlgorithmBoxFlushing(boxId, active)
{
    const box = document.getElementById(boxId);
    if (!box) {
        return;
    }
    box.classList.toggle("algo-box-flushing", active);
}

function runQuitPhase()
{
    return new Promise((resolve) => {
        if (total_data.length === 0) {
            resolve();
            return;
        }

        const beforeLen = total_data.length;
        quit();
        const startedAt = Date.now();
        const maxWaitMs = Math.max(2500, Math.floor(delay * 2));

        const poll = () => {
            if (total_data.length < beforeLen || (Date.now() - startedAt) > maxWaitMs) {
                resolve();
                return;
            }
            requestAnimationFrame(poll);
        };
        poll();
    });
}

async function next_step() {
    if (nextStepInProgress) {
        return;
    }
    const selectedStructures = getSelectedStructureNames();
    if (total_data.length === 0) {
        running = false;
        return;
    }
    for (const structureName of selectedStructures) {
        if (getStructureDataLength(structureName) === 0) {
            running = false;
            return;
        }
    }

    nextStepInProgress = true;
    updateInsertionsPanel(true);

    try {
        const executionOrder = getStructureExecutionOrder();
        const phaseResults = {};
        for (const structureName of executionOrder) {
            const boxId = getStructureBoxId(structureName);
            const phaseRunner = getStructurePhaseRunner(structureName);
            if (!phaseRunner) {
                continue;
            }

            if (boxId) {
                setAlgorithmBoxActive(boxId, true);
            }
            phaseResults[structureName] = await phaseRunner();
            if (boxId) {
                setAlgorithmBoxActive(boxId, false);
            }
        }

        if (!selectedStructures.includes("QuIT")) {
            total_data.shift();
            updateInsertionsPanel(false);
        }

        if (total_data.length === 0) {
            running = false;
        }

        clearSwareComparisonPreview();
        syncSelectedStructureChartHistory();
        if (typeof update_table === "function") {
            update_table();
        }
        if (typeof update_charts === "function") {
            update_charts();
        }
    }
    finally {
        for (const boxId of Object.values(STRUCTURE_BOX_IDS)) {
            setAlgorithmBoxActive(boxId, false);
        }
        setAlgorithmBoxFlushing("sware-box", false);
        nextStepInProgress = false;
    }
}

function generateSources(n, k, taken) {
    let count = 0;
    let sources = new Array();
    let r;
    while (count < Math.floor(k / 2)) {
        r = Math.floor(Math.random() * n) + 1;
        if (taken.get(r) === true) {
            taken.set(r, false);
            sources.push(r);
            count++;
        }
    }
    return sources;
}

function swapElements(array, x, y) {
    let temp;
    temp = array[x];
    array[x] = array[y];
    array[y] = temp;
}

//returns a array with numbers of (k-l) sortedness
function generate(k, l, n, b, a) {
    l--;
    let array = [];
    let betaValue;
    for (let i = 1; i < n + 1; i++) {
        array.push(i);
    }
    let firstSwap;
    let max, min;
    let betaIndex = 0;
    let taken = new Map();
    let sources = new Array();
    let swappingFirst = true;
    let randomPick;
    //precautionary so no value not in array is swapped
    taken.set(0, false);
    taken.set(n + 1, false);
    //set all array indexes to true because you can swap with any of them
    for (let i = 0; i < n; i++) {
        taken.set(i, true);
    }
    //swap first element by l to ensure there is a max displacement of l
    if (k < 2) {
        swappingFirst = false;
    }
    while (swappingFirst) {
        if (Math.random() < 0.5) {
            firstSwap = Math.floor((n - l) * Math.random());
            if (firstSwap + l < n && taken.get(firstSwap) && taken.get(firstSwap + l)) {
                swapElements(array, firstSwap, firstSwap + l);
                taken.set(firstSwap, false);
                taken.set(firstSwap + l, false);
                swappingFirst = false;
                //console.log("firstSwap: " + firstSwap, firstSwap + l);
            }
        }
        else {
            firstSwap = l + Math.floor((n - l) * Math.random());
            if (firstSwap - l > 1 && taken.get(firstSwap) && taken.get(firstSwap - l)) {
                swapElements(array, firstSwap, firstSwap - l);
                taken.set(firstSwap, false);
                taken.set(firstSwap - l, false);
                swappingFirst = false;
                //console.log("firstSwap: " + firstSwap, firstSwap - l);
            }
        }
    }
    //indexes of elements we will swap
    let regenerateCount = 0;
    sources = generateSources(n, k - 2, taken);
    //console.log(sources.length, n);
    while (sources.length != 0 && regenerateCount < 5000) {
        for (let j = 0; j < (n / 100) && sources.length != 0; j++) {
            for (let i = 0; i < sources.length; i++) {
                min = Math.max(0, sources[i] - l);
                max = Math.min(n - 1, sources[i] + l);
                betaValue = jStat.beta.sample(a, b);
                if (Math.random() < 0.5) {
                    randomPick = Math.floor(sources[i] - (sources[i] - min) * betaValue);
                }
                else {
                    randomPick = Math.floor(sources[i] + (max - sources[i]) * betaValue);
                }
                //console.log(randomPick);
                if (taken.get(randomPick) && randomPick != sources[i]) {
                    swapElements(array, sources[i], randomPick);
                    taken.set(randomPick, false);
                    taken.set(sources[i], false);
                    sources.splice(i, 1);
                    i--;
                }
            }
        }
        //console.log("regenerate");
        regenerateCount++;
        for (let i = 0; i < sources.length; i++) {
            taken.set(sources[i], true);
        }
        sources = generateSources(n, (2 * sources.length), taken);
    }
    //if odd n swap element that has already been swapped with an element that hasn't already been swapped
    if (k % 2 == 1) {
        let odd = Math.floor(Math.random() * n);
        while (taken.get(odd) && odd > 0) {
            odd = Math.floor(Math.random() * n);
        }
        min = Math.max(1, odd - l);
        max = Math.min(n, odd + l);
        betaValue = jStat.beta.sample(a, b);
        let oddSwap;
        oddSwap = Math.floor(min + (max - min) * betaValue);
        while (!taken.get(oddSwap) && !((Math.abs(array[odd] - odd)) < l) && !((Math.abs(array[oddSwap] - oddSwap)) < l)) {
            betaValue = jStat.beta.sample(a, b);
            oddSwap = Math.floor(min + (max - min) * betaValue);
        }
        swapElements(array, odd, oddSwap);
    }
    return array;
}

function getRandomInteger(min, max) {
    if (max <= min) {
        return min;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
}

function createSortedDataset(n) {
    let dataset = [];
    for (let value = 1; value <= n; value++) {
        dataset.push(value);
    }
    return dataset;
}

function countDatasetInversions(dataset) {
    let inversionCount = 0;

    for (let currentIndex = 0; currentIndex < dataset.length; currentIndex++) {
        for (let previousIndex = 0; previousIndex < currentIndex; previousIndex++) {
            if (dataset[previousIndex] > dataset[currentIndex]) {
                inversionCount++;
            }
        }
    }

    return inversionCount;
}

function getSecondaryMetricTargetCount(metricType, dataset, kElementCount) {
    if (metricType === "inversions") {
        return countDatasetInversions(dataset);
    }
    return Math.round(kElementCount / 2);
}

function createMaximumInversionsByPosition(n) {
    let maximumInversionsByPosition = new Array(n).fill(0);
    for (let position = 0; position < n; position++) {
        maximumInversionsByPosition[position] = n - position - 1;
    }
    return maximumInversionsByPosition;
}

function buildDatasetFromInversionCountsByPosition(inversionCountsByPosition) {
    let dataset = new Array(inversionCountsByPosition.length);
    let remainingValues = createSortedDataset(inversionCountsByPosition.length);

    for (let position = 0; position < inversionCountsByPosition.length; position++) {
        let remainingValueIndex = inversionCountsByPosition[position];
        let value = remainingValues[remainingValueIndex];
        dataset[position] = value;
        remainingValues.splice(remainingValueIndex, 1);
    }

    return dataset;
}

function createTrackedPositionSet(size, positions) {
    let trackedPositionSet = {
        positions: positions.slice(),
        positionIndexes: new Array(size).fill(-1)
    };

    for (let trackedIndex = 0; trackedIndex < trackedPositionSet.positions.length; trackedIndex++) {
        trackedPositionSet.positionIndexes[trackedPositionSet.positions[trackedIndex]] = trackedIndex;
    }

    return trackedPositionSet;
}

function addTrackedPosition(trackedPositionSet, position) {
    if (trackedPositionSet.positionIndexes[position] !== -1) {
        return;
    }

    trackedPositionSet.positionIndexes[position] = trackedPositionSet.positions.length;
    trackedPositionSet.positions.push(position);
}

function removeTrackedPosition(trackedPositionSet, position) {
    let trackedIndex = trackedPositionSet.positionIndexes[position];
    if (trackedIndex === -1) {
        return;
    }

    let lastTrackedPosition = trackedPositionSet.positions[trackedPositionSet.positions.length - 1];
    trackedPositionSet.positions[trackedIndex] = lastTrackedPosition;
    trackedPositionSet.positionIndexes[lastTrackedPosition] = trackedIndex;
    trackedPositionSet.positions.pop();
    trackedPositionSet.positionIndexes[position] = -1;
}

function chooseRandomTrackedPosition(trackedPositionSet) {
    let trackedIndex = Math.floor(Math.random() * trackedPositionSet.positions.length);
    return trackedPositionSet.positions[trackedIndex];
}

function createTrackedInversionPositionSets(inversionCountsByPosition, maximumInversionsByPosition) {
    let positionsWithInversions = [];
    let positionsWithRemainingCapacity = [];

    for (let position = 0; position < inversionCountsByPosition.length; position++) {
        if (inversionCountsByPosition[position] > 0) {
            positionsWithInversions.push(position);
        }
        if (inversionCountsByPosition[position] < maximumInversionsByPosition[position]) {
            positionsWithRemainingCapacity.push(position);
        }
    }

    return {
        trackedPositionsWithInversions: createTrackedPositionSet(inversionCountsByPosition.length, positionsWithInversions),
        trackedPositionsWithRemainingCapacity: createTrackedPositionSet(
            inversionCountsByPosition.length,
            positionsWithRemainingCapacity
        )
    };
}

function updateTrackedInversionPosition(
    inversionCountsByPosition,
    maximumInversionsByPosition,
    trackedPositionsWithInversions,
    trackedPositionsWithRemainingCapacity,
    position,
    inversionCountChange
) {
    inversionCountsByPosition[position] += inversionCountChange;

    if (inversionCountsByPosition[position] > 0) {
        addTrackedPosition(trackedPositionsWithInversions, position);
    } else {
        removeTrackedPosition(trackedPositionsWithInversions, position);
    }

    if (inversionCountsByPosition[position] < maximumInversionsByPosition[position]) {
        addTrackedPosition(trackedPositionsWithRemainingCapacity, position);
    } else {
        removeTrackedPosition(trackedPositionsWithRemainingCapacity, position);
    }
}

function generateRandomInversionCountsByPosition(n, targetInversionCount) {
    let inversionCountsByPosition = new Array(n).fill(0);
    let maximumInversionsByPosition = createMaximumInversionsByPosition(n);
    let trackedPositionSets = createTrackedInversionPositionSets(
        inversionCountsByPosition,
        maximumInversionsByPosition
    );
    let trackedPositionsWithInversions = trackedPositionSets.trackedPositionsWithInversions;
    let trackedPositionsWithRemainingCapacity = trackedPositionSets.trackedPositionsWithRemainingCapacity;
    let remainingInversions = targetInversionCount;

    while (remainingInversions > 0 && trackedPositionsWithRemainingCapacity.positions.length > 0) {
        let position = chooseRandomTrackedPosition(trackedPositionsWithRemainingCapacity);
        let maximumIncreaseAtPosition = Math.min(
            remainingInversions,
            maximumInversionsByPosition[position] - inversionCountsByPosition[position]
        );
        let inversionIncrease = getRandomInteger(1, maximumIncreaseAtPosition);

        updateTrackedInversionPosition(
            inversionCountsByPosition,
            maximumInversionsByPosition,
            trackedPositionsWithInversions,
            trackedPositionsWithRemainingCapacity,
            position,
            inversionIncrease
        );
        remainingInversions -= inversionIncrease;
    }

    mixInversionCountsByPosition(
        inversionCountsByPosition,
        maximumInversionsByPosition,
        trackedPositionsWithInversions,
        trackedPositionsWithRemainingCapacity
    );

    return inversionCountsByPosition;
}

function mixInversionCountsByPosition(
    inversionCountsByPosition,
    maximumInversionsByPosition,
    trackedPositionsWithInversions,
    trackedPositionsWithRemainingCapacity
) {
    let mixingRoundCount = Math.min(20000, inversionCountsByPosition.length * 2);

    for (let mixingRound = 0; mixingRound < mixingRoundCount; mixingRound++) {
        if (
            trackedPositionsWithInversions.positions.length === 0
            || trackedPositionsWithRemainingCapacity.positions.length === 0
        ) {
            break;
        }

        let sourcePosition = chooseRandomTrackedPosition(trackedPositionsWithInversions);
        let targetPosition = chooseRandomTrackedPosition(trackedPositionsWithRemainingCapacity);

        if (sourcePosition === targetPosition) {
            continue;
        }

        let maximumTransferCount = Math.min(
            inversionCountsByPosition[sourcePosition],
            maximumInversionsByPosition[targetPosition] - inversionCountsByPosition[targetPosition]
        );

        if (maximumTransferCount <= 0) {
            continue;
        }

        let inversionTransferCount = getRandomInteger(1, maximumTransferCount);
        updateTrackedInversionPosition(
            inversionCountsByPosition,
            maximumInversionsByPosition,
            trackedPositionsWithInversions,
            trackedPositionsWithRemainingCapacity,
            sourcePosition,
            -inversionTransferCount
        );
        updateTrackedInversionPosition(
            inversionCountsByPosition,
            maximumInversionsByPosition,
            trackedPositionsWithInversions,
            trackedPositionsWithRemainingCapacity,
            targetPosition,
            inversionTransferCount
        );
    }
}

function generateDatasetWithInversionCount(n, inversionCount) {
    const targetInversionCount = clampSecondaryMetricCount("inversions", n, inversionCount);
    let inversionCountsByPosition = generateRandomInversionCountsByPosition(n, targetInversionCount);
    return buildDatasetFromInversionCountsByPosition(inversionCountsByPosition);
}

function generatePositiveIntegerComposition(total, parts) {
    let composition = new Array(parts).fill(1);
    for (let remaining = total - parts; remaining > 0; remaining--) {
        composition[Math.floor(Math.random() * parts)]++;
    }
    return composition;
}

function shuffleArrayInPlace(array) {
    for (let index = array.length - 1; index > 0; index--) {
        let swapIndex = Math.floor(Math.random() * (index + 1));
        swapElements(array, index, swapIndex);
    }
}

function chooseRandomDistinctValues(n, count) {
    let values = createSortedDataset(n);
    for (let index = 0; index < count; index++) {
        let swapIndex = index + Math.floor(Math.random() * (n - index));
        swapElements(values, index, swapIndex);
    }
    return values.slice(0, count);
}

function generateDatasetWithExchangeCount(n, exchangeCount) {
    const targetExchangeCount = clampSecondaryMetricCount("exchanges", n, exchangeCount);
    let dataset = createSortedDataset(n);

    if (targetExchangeCount === 0) {
        return dataset;
    }

    let maxCycleCount = Math.min(targetExchangeCount, n - targetExchangeCount);
    let cycleCount = getRandomInteger(1, maxCycleCount);
    let cycleSizes = generatePositiveIntegerComposition(targetExchangeCount, cycleCount)
        .map((cycleContribution) => cycleContribution + 1);
    let touchedValues = chooseRandomDistinctValues(n, targetExchangeCount + cycleCount);

    let offset = 0;
    for (let cycleSizeIndex = 0; cycleSizeIndex < cycleSizes.length; cycleSizeIndex++) {
        let cycleSize = cycleSizes[cycleSizeIndex];
        let cycleValues = touchedValues.slice(offset, offset + cycleSize);
        shuffleArrayInPlace(cycleValues);
        for (let valueIndex = 0; valueIndex < cycleValues.length; valueIndex++) {
            let currentValue = cycleValues[valueIndex];
            let nextValue = cycleValues[(valueIndex + 1) % cycleValues.length];
            dataset[currentValue - 1] = nextValue;
        }
        offset += cycleSize;
    }

    return dataset;
}

function generateSecondaryMetricDataset(metricType, n, metricCount) {
    if (metricType === "inversions") {
        return generateDatasetWithInversionCount(n, metricCount);
    }
    return generateDatasetWithExchangeCount(n, metricCount);
}
