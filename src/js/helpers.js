class Node{
    constructor(t,leaf)
    {
        this.t = t;
        this.leaf = leaf;
        this.keys = [];
        this.children = [];
        this.n = 0//size of node
        this.next = null;
        this.parent = null;
    }
}

// Keep track of last values shown in the summary cards so we can
// highlight cards when a value changes.
var lastSummaryValues = {};


function calculate_internal(size)
{
    let node_info = 8*2+2*2;//size for 2 pointers and 2 16 bit ints
    let block_size = size*4+node_info+size*8;
    let internal_node_size = Math.floor((block_size-node_info-8)/12);
    return internal_node_size;
}



/*
 * Adjust a list of data for Google Charts plotting
 */

function adjust_for_plotting(N, data)
{
    let data_points = [];
    for(let i = 1; i <= N; i++)
    {
        data_points.push(i);
    }
    
    // create data array
    let plot_data = [];
    plot_data.push(['Position', 'Value']);
    for(let i = 0; i < N; i++)
    {
        plot_data.push([data_points[i], data[i]]);
    }

    return plot_data;
}



function adjust_for_plotly_plotting(data_points) {
    let dataArray = [];
    for(let i = 0; i < data_points.length; i++) {
        dataArray.push(data_points[i]);
    }
    
    // Separate data into in-order and out-of-order points
    let inOrderX = [];
    let inOrderY = [];
    let outOfOrderX = [];
    let outOfOrderY = [];
    
    dataArray.forEach((value, index) => {
        // Check if value is in its correct position
        // (index+2 due to 1-indexing conversion as mentioned in your comment)
        if (value === (index + 1)) {
            inOrderX.push(index + 1);
            inOrderY.push(value);
        } else {
            outOfOrderX.push(index + 1);
            outOfOrderY.push(value);
        }
    });
    
    // Create separate traces for legend
    let traces = [];
    
    // Add in-order points
    if (inOrderX.length > 0) {
        traces.push({
            x: inOrderX,
            y: inOrderY,
            type: 'scatter',
            mode: 'markers',
            name: 'In Order',
            marker: {
                color: 'blue',
                size: 6
            }
        });
    }
    
    // Add out-of-order points
    if (outOfOrderX.length > 0) {
        traces.push({
            x: outOfOrderX,
            y: outOfOrderY,
            type: 'scatter',
            mode: 'markers',
            name: 'Out of Order',
            marker: {
                color: 'red',
                size: 6
            }
        });
    }
    
    return traces;
}

/*
 * Update the colors of the SWARE buffer
 */

function update_colors() {

    // Reset colors of the SWARE buffer
    function reset_colors() {
        for (let i = 0; i < 10; i++) {
            const iter = document.getElementById("buffer" + i);
                if (i % 2 == 0) {
                iter.style.backgroundColor = "#808080";
            }
            else {
                iter.style.backgroundColor = "#d3d3d3";
            }
        }
    }
    
    if (state == 0) {
        // reset the colors
        reset_colors();
    }
    else if (state == 1) {
        reset_colors();
        if (lastSortedIndex == -1) {
            const first = document.getElementById("buffer0");
            first.style.backgroundColor = "#0097B5"; // dark blue (sorted)
        }
        else {
            for (let i = 0; i <= lastSortedIndex; i++) {
                const iter = document.getElementById("buffer" + i);
                if (i % 2 == 0) {
                    iter.style.backgroundColor = "#0097B5"; // dark blue (sorted)
                }
                else {
                    iter.style.backgroundColor = "#00D5FF"; // light blue (sorted)
                }
            }
        }     
    }
    else if (state == 2) {
        reset_colors();
        if (lastSortedIndex == -1) {
            const first = document.getElementById("buffer0");
            first.style.backgroundColor = "#05B51C"; // dark green (sorted)
            const next = document.getElementById("buffer1");
            next.style.backgroundColor = "#FF0000"; // red (overlaps)
            const d = document.getElementById("buffer" + overlapper);
            d.style.backgroundColor = "#FF0000"; // red (overlaps)
        }
        else {
            let i;
            for (i = 0; i <= lastSortedIndex; i++) {
                const iter = document.getElementById("buffer" + i);
                if (i % 2 == 0) {
                    iter.style.backgroundColor = "#05B51C"; // dark green (sorted)
                }
                else {
                    iter.style.backgroundColor = "#00FF22"; // light green (sorted)
                }
            }
            if (i < 10) {
                for(i;i<=9;i++)
                {
                    const overlapped = document.getElementById("buffer" + i);
                    overlapped.style.backgroundColor = "#FF0000"; // red (overlaps)
                }
            }
        }     
    }
}


/*
 * Runs after stop button is clicked
 */

function stop_button() {
    running = false;
    if (typeof animationIntervalId !== "undefined" && animationIntervalId != null) {
        clearInterval(animationIntervalId);
        animationIntervalId = null;
    }
    document.getElementById("stop-button").disabled = true;
    document.getElementById("continue-button").disabled = false;
    const nextstepButton = document.getElementById("nextstep-button");
    if (nextstepButton) {
        nextstepButton.disabled = false;
    }

    console.log("Animation stopped.");
}

/*
 * Runs after continue button is clicked
 */

function continue_button() {
    running = true;
    if (typeof animationIntervalId !== "undefined" && animationIntervalId != null) {
        clearInterval(animationIntervalId);
    }
    document.getElementById("stop-button").disabled = false;
    document.getElementById("continue-button").disabled = true;
    const nextstepButton = document.getElementById("nextstep-button");
    if (nextstepButton) {
        nextstepButton.disabled = true;
    }

    animationIntervalId = setInterval(() => {
        if (running == false) {
            clearInterval(animationIntervalId);
            animationIntervalId = null;
            return;
        }
        next_step(); 
    }, delay);
    console.log("Animation continues.");
}


/*
 * Runs after next step button is clicked
 */

function nextstep_button() {
    running = false;
    next_step();
    console.log("Next step done.")
}

/*
 * Runs after reset button is clicked
 */

function reset_button() {
    if (typeof animationIntervalId !== "undefined" && animationIntervalId != null) {
        clearInterval(animationIntervalId);
        animationIntervalId = null;
    }
    valsToEliminate = vals.slice();

    function resetDropdown(field, key) {
        field.length = 0;
        let op = document.createElement('option');
        op.value = "";
        op.text = "";
        field.appendChild(op);

        let uniqueValues = [...new Set(valsToEliminate.map(p => p[key]))].sort((a, b) => a - b);
        for (const value of uniqueValues) {
            let op = document.createElement('option');
            op.value = value;
            op.text = value;
            field.appendChild(op);
        }
    }

    // Reset parameters

    selectedN;
    selectedK;
    selectedL; 
    selectedB;
    selectedI; 

    wait = 3; 
    delay = 1000; 
    total_data = []; 
    sware_data = [];
    tail_data = [];
    lil_data = [];
    total_inversion_data = [];
    running = true; 
    nextStepInProgress = false;

    buffer = [];
    tree = [];
    zones = []; 
    lastSortedIndex = -1; 
    moved = false; 
    partitioned_data = []; 
    state = 0;
    sware_max_tree = Number.MIN_SAFE_INTEGER;
    sware_max_buffer = Number.MIN_SAFE_INTEGER; 
    numInsideBuffer = 0; 
    overlapped; 
    overlapper; 
    overlapperSet = false;
    zones_dict = {}; 

    inserted_data_quit = []; 
    leaf_node_size = 10;
    pole = []; 
    pole_prev = [];
    pole_next = []; 

    sware_sorts = 0;
    sware_sorts_history = [];
    sware_flushes = 0;
    sware_flushes_history = [];
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
    quitTree = new QuIT(15);
    swareTree = new Sware(5);
    tailTree = new Tail(10);
    lilTree = new LilTree(10);
    quit_leaf_dict = [];
    initializeQuitVisualization();
    initializeSwareVisualization();
    if (typeof initializeTailVisualization === "function") {
        initializeTailVisualization();
    }
    if (typeof initializeLilVisualization === "function") {
        initializeLilVisualization();
    }
    if (typeof returnStructurePanelsToStore === "function") {
        returnStructurePanelsToStore();
    }

    // Reset each dropdown
    resetDropdown(document.getElementById("cmp-select-N"), "N");
    resetDropdown(document.getElementById("cmp-select-K"), "K");
    resetDropdown(document.getElementById("cmp-select-L"), "L");
    resetDropdown(document.getElementById("cmp-select-B"), "B");
    resetDropdown(document.getElementById("cmp-select-I"), "I");
    const indexStructure1 = document.getElementById("cmp-select-index-1");
    const indexStructure2 = document.getElementById("cmp-select-index-2");
    if (indexStructure1) {
        indexStructure1.value = "SWARE";
    }
    if (indexStructure2) {
        indexStructure2.value = "QuIT";
    }

    // Hide elements that should not be visible initially
    document.getElementById("chart-column").classList.add("hidden");
    document.getElementById("buttons-container-wrapper").classList.add("hidden");
    document.getElementById("tree-area-step-3+").classList.add("hidden");
    document.getElementById("buffer-area").classList.add("hidden");
    document.getElementById("insertions-area").classList.add("hidden");
    document.getElementById("dashed-line").classList.add("hidden");
    document.getElementById("run-button-container").classList.add("hidden");
    document.getElementById("results-panel").classList.add("hidden");
    document.getElementById("plots").classList.add("hidden");
    document.getElementById("animations-div").classList.add("hidden");
    // stop_animation(); 

    console.log("Reset to default state.");
}

function getResultsPanelRows()
{
    const costResult = document.getElementById("cost-result");
    if (!costResult) {
        return [];
    }

    return Array.from(costResult.children).filter((child) => child.classList && child.classList.contains("row"));
}

function getResultsRowBoundarySpans(rows, rowIndex)
{
    if (!Array.isArray(rows) || rowIndex < 0 || rowIndex >= rows.length) {
        return [null, null];
    }

    const row = rows[rowIndex];
    const leftContainer = row.children[0] || null;
    const rightContainer = row.children[2] || null;
    const leftSpan = leftContainer ? leftContainer.querySelector("span") : null;
    const rightSpan = rightContainer ? rightContainer.querySelector("span") : null;
    return [leftSpan, rightSpan];
}

function setResultsSpanValue(span, value)
{
    if (!span) {
        return;
    }
    span.textContent = value == null ? "N/A" : value;
}

function setResultsTitleValue(span, value)
{
    if (!span) {
        return;
    }
    span.textContent = value == null ? "" : value;
}

function getTreeTopInsertCount(tree)
{
    if (!tree) {
        return null;
    }
    if (typeof tree.topInserts === "number") {
        return tree.topInserts;
    }
    const treeSize = getTreeSize(tree);
    if (typeof treeSize === "number" && typeof tree.fastInserts === "number") {
        return Math.max(0, treeSize - tree.fastInserts);
    }
    return null;
}

function getTreeSize(tree)
{
    if (!tree) {
        return null;
    }
    if (typeof tree.size === "number") {
        return tree.size;
    }
    if (!tree.root) {
        return null;
    }

    let total = 0;
    const stack = [tree.root];
    while (stack.length > 0) {
        const node = stack.pop();
        if (!node) {
            continue;
        }

        if (node.leaf) {
            if (typeof node.n === "number") {
                total += node.n;
            }
            else if (Array.isArray(node.keys)) {
                total += node.keys.length;
            }
            continue;
        }

        if (Array.isArray(node.children)) {
            for (let i = node.children.length - 1; i >= 0; i--) {
                if (node.children[i]) {
                    stack.push(node.children[i]);
                }
            }
        }
    }

    return total;
}

function getSwareManualSortedPageCount()
{
    if (swareComparisonPreview && typeof swareComparisonPreview.sortPages === "number") {
        return swareComparisonPreview.sortPages;
    }
    if (!swareTree || typeof swareTree.sortPages !== "number") {
        return null;
    }
    return swareTree.sortPages;
}

function getSwareAveragePagesPerFlush()
{
    if (!swareTree || typeof swareTree.avgPages !== "number") {
        return 0;
    }
    return Math.round(swareTree.avgPages * 10) / 10;
}

function getSwareBulkloadedPageCount(fastInsertCount)
{
    const pageSize = swareTree && typeof swareTree.t === "number" && swareTree.t > 0
        ? swareTree.t
        : 10;
    if (typeof fastInsertCount !== "number" || pageSize <= 0) {
        return null;
    }
    return Math.round((fastInsertCount / pageSize) * 10) / 10;
}

function getComparisonMetricsByStructure()
{
    const swareFastInserts = swareComparisonPreview && typeof swareComparisonPreview.fastInserts === "number"
        ? swareComparisonPreview.fastInserts
        : (swareTree && typeof swareTree.fastInserts === "number" ? swareTree.fastInserts : null);
    const swareTopInsertCount = swareComparisonPreview && typeof swareComparisonPreview.topInserts === "number"
        ? swareComparisonPreview.topInserts
        : getTreeTopInsertCount(swareTree);
    const swareManualSortedPages = getSwareManualSortedPageCount();
    const swareBulkloadedPages = getSwareBulkloadedPageCount(swareFastInserts);
    const quitFastInserts = quitTree && typeof quitTree.fastInserts === "number"
        ? quitTree.fastInserts
        : null;
    const lilFastInserts = lilTree && typeof lilTree.fastInserts === "number"
        ? lilTree.fastInserts
        : null;
    const tailFastInserts = tailTree && typeof tailTree.fastInserts === "number"
        ? tailTree.fastInserts
        : null;

    return {
        SWARE: {
            title: "SWARE",
            manualSortedPages: swareManualSortedPages,
            averagePagesPerFlush: getSwareAveragePagesPerFlush(),
            pagesBulkloaded: swareBulkloadedPages,
            fastInserts: swareFastInserts,
            topInserts: swareTopInsertCount,
            fastPathResets: null
        },
        QuIT: {
            title: "QuIT",
            manualSortedPages: null,
            averagePagesPerFlush: null,
            pagesBulkloaded: null,
            fastInserts: quitFastInserts,
            topInserts: getTreeTopInsertCount(quitTree),
            fastPathResets: quitTree && typeof quitTree.fastPathResets === "number"
                ? quitTree.fastPathResets
                : null
        },
        Tail: {
            title: "Tail",
            manualSortedPages: null,
            averagePagesPerFlush: null,
            pagesBulkloaded: null,
            fastInserts: tailFastInserts,
            topInserts: getTreeTopInsertCount(tailTree),
            fastPathResets: null
        },
        lil: {
            title: "lil",
            manualSortedPages: null,
            averagePagesPerFlush: null,
            pagesBulkloaded: null,
            fastInserts: lilFastInserts,
            topInserts: getTreeTopInsertCount(lilTree),
            fastPathResets: lilTree && typeof lilTree.fastPathResets === "number"
                ? lilTree.fastPathResets
                : null
        }
    };
}

function update_table() {
    const rows = getResultsPanelRows();
    if (rows.length < 7) {
        return;
    }

    const selectedStructures = typeof getSelectedStructureNames === "function"
        ? getSelectedStructureNames()
        : ["SWARE", "QuIT"];
    const metrics = getComparisonMetricsByStructure();
    const fallbackLeft = {
        title: selectedStructures[0] || "N/A",
        manualSortedPages: null,
        averagePagesPerFlush: null,
        pagesBulkloaded: null,
        fastInserts: null,
        topInserts: null,
        fastPathResets: null
    };
    const fallbackRight = {
        title: selectedStructures[1] || "N/A",
        manualSortedPages: null,
        averagePagesPerFlush: null,
        pagesBulkloaded: null,
        fastInserts: null,
        topInserts: null,
        fastPathResets: null
    };
    const leftMetrics = metrics[selectedStructures[0]] || fallbackLeft;
    const rightMetrics = metrics[selectedStructures[1]] || fallbackRight;

    let spans = getResultsRowBoundarySpans(rows, 0);
    setResultsTitleValue(spans[0], leftMetrics.title);
    setResultsTitleValue(spans[1], rightMetrics.title);

    spans = getResultsRowBoundarySpans(rows, 1);
    setResultsSpanValue(spans[0], leftMetrics.manualSortedPages);
    setResultsSpanValue(spans[1], rightMetrics.manualSortedPages);

    spans = getResultsRowBoundarySpans(rows, 2);
    setResultsSpanValue(spans[0], leftMetrics.averagePagesPerFlush);
    setResultsSpanValue(spans[1], rightMetrics.averagePagesPerFlush);

    spans = getResultsRowBoundarySpans(rows, 3);
    setResultsSpanValue(spans[0], leftMetrics.pagesBulkloaded);
    setResultsSpanValue(spans[1], rightMetrics.pagesBulkloaded);

    spans = getResultsRowBoundarySpans(rows, 4);
    setResultsSpanValue(spans[0], leftMetrics.fastInserts);
    setResultsSpanValue(spans[1], rightMetrics.fastInserts);

    spans = getResultsRowBoundarySpans(rows, 5);
    setResultsSpanValue(spans[0], leftMetrics.topInserts);
    setResultsSpanValue(spans[1], rightMetrics.topInserts);

    spans = getResultsRowBoundarySpans(rows, 6);
    setResultsSpanValue(spans[0], leftMetrics.fastPathResets);
    setResultsSpanValue(spans[1], rightMetrics.fastPathResets);
    // Also update the compact summary cards shown in the results panel
    // so they reflect the same values as the detailed table.
    try {
        updateSummaryCards();
    } catch (e) {
        // don't let this break existing flows
        console.warn('updateSummaryCards failed', e);
    }
}


/**
 * Update the `.m-card` summary cards in the results panel to match
 * the same metrics used by `update_table()`.
 */
function updateSummaryCards()
{
    const selectedStructures = typeof getSelectedStructureNames === "function"
        ? getSelectedStructureNames()
        : ["SWARE", "QuIT"];

    const metrics = getComparisonMetricsByStructure();
    const leftMetrics = metrics[selectedStructures[0]] || {};
    const rightMetrics = metrics[selectedStructures[1]] || {};

    // Find summary cards inside the results panel. If not present, bail out.
    const cards = document.querySelectorAll('#results-gap .metrics .m-card, .metrics .m-card');
    if (!cards || cards.length === 0) {
        return;
    }

    function normalizeTitle(str) {
        if (!str || typeof str !== 'string') return '';
        return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    }

    cards.forEach((card) => {
        const titleEl = card.querySelector('.m-name');
        const valueEls = card.querySelectorAll('.m-n');
        if (!titleEl || !valueEls || valueEls.length < 1) {
            return;
        }

        const rawName = titleEl.textContent.trim();
        const name = normalizeTitle(rawName);
        let leftVal = null;
        let rightVal = null;
        // Determine metric by normalized title (robust to wording changes)
        if (name.includes('sorted') || name.includes('# pages manually sorted') || name.includes('sort')) {
            leftVal = leftMetrics.manualSortedPages;
            rightVal = rightMetrics.manualSortedPages;
        } else if (name.includes('avg') && name.includes('flush')) {
            leftVal = leftMetrics.averagePagesPerFlush;
            rightVal = rightMetrics.averagePagesPerFlush;
        } else if (name.includes('pages bulk') || name.includes('bulk loaded')) {
            // Card shows pages bulk loaded. Show number for SWARE; show '-' for QuIT
            if (selectedStructures[0] === 'SWARE') {
                leftVal = (typeof leftMetrics.pagesBulkloaded === 'number') ? leftMetrics.pagesBulkloaded : null;
            } else {
                leftVal = '-';
            }

            if (selectedStructures[1] === 'SWARE') {
                rightVal = (typeof rightMetrics.pagesBulkloaded === 'number') ? rightMetrics.pagesBulkloaded : null;
            } else {
                rightVal = '-';
            }
        } else if (name.includes('bulk') || (name.includes('fast inserts') && name.includes('bulk'))) {
            // Show only # Fast Inserts for combined-style cards. For SWARE, compute fast inserts
            // from pages bulk loaded: fastInserts = pagesBulkloaded * pageSize.
            const pageSize = (swareTree && typeof swareTree.t === 'number') ? swareTree.t : 10;

            // Left side
            if (selectedStructures[0] === 'SWARE') {
                if (typeof leftMetrics.pagesBulkloaded === 'number') {
                    leftVal = Math.round(leftMetrics.pagesBulkloaded * pageSize);
                } else if (typeof leftMetrics.fastInserts === 'number') {
                    leftVal = leftMetrics.fastInserts;
                } else {
                    leftVal = null;
                }
            } else {
                leftVal = (typeof leftMetrics.fastInserts === 'number') ? leftMetrics.fastInserts : null;
            }

            // Right side
            if (selectedStructures[1] === 'SWARE') {
                if (typeof rightMetrics.pagesBulkloaded === 'number') {
                    rightVal = Math.round(rightMetrics.pagesBulkloaded * pageSize);
                } else if (typeof rightMetrics.fastInserts === 'number') {
                    rightVal = rightMetrics.fastInserts;
                } else {
                    rightVal = null;
                }
            } else {
                rightVal = (typeof rightMetrics.fastInserts === 'number') ? rightMetrics.fastInserts : null;
            }
        } else if (name.includes('fast inserts') && !name.includes('bulk')) {
            leftVal = leftMetrics.fastInserts;
            rightVal = rightMetrics.fastInserts;
        } else if (name.includes('top insert') || name.includes('top inserts')) {
            leftVal = leftMetrics.topInserts;
            rightVal = rightMetrics.topInserts;
        } else if (name.includes('fast path') || name.includes('resets') || name.includes('fast path resets')) {
            leftVal = leftMetrics.fastPathResets;
            rightVal = rightMetrics.fastPathResets;
        } else {
            // Unknown card — do nothing
            return;
        }

        // Write values into the card nodes. The markup puts left value first, then right.
        const displayLeft = (leftVal == null) ? '—' : leftVal;
        const displayRight = (rightVal == null) ? '—' : rightVal;

        // Change detection: highlight card if either side changed since last update
        const key = name; // already normalized
        const prev = lastSummaryValues[key] || { left: null, right: null };
        const changed = (prev.left !== displayLeft) || (prev.right !== displayRight);

        if (valueEls[0]) {
            valueEls[0].textContent = displayLeft;
        }
        if (valueEls[1]) {
            valueEls[1].textContent = displayRight;
        }

        // If changed, add a transient highlight class and update tracked values
        if (changed) {
            try {
                card.classList.add('metric-updated');
                // Remove highlight after a short delay so it draws attention
                window.setTimeout(() => {
                    try { card.classList.remove('metric-updated'); } catch (e) { }
                }, 1200);
            } catch (e) {
                // ignore
            }
            lastSummaryValues[key] = { left: displayLeft, right: displayRight };
        }
    });
}
function getHistoryMax(history)
{
    if (!Array.isArray(history) || history.length === 0) {
        return 0;
    }
    return Math.max(...history);
}

function getStructureChartColor(structureName)
{
    if (typeof STRUCTURE_CHART_COLORS === "undefined" || !STRUCTURE_CHART_COLORS) {
        return "#80CBC4";
    }
    return STRUCTURE_CHART_COLORS[structureName] || "#80CBC4";
}

function updateComparisonLegends()
{
    const selectedStructures = (typeof comparisonChartHistory !== "undefined" && comparisonChartHistory)
        ? [comparisonChartHistory.leftName, comparisonChartHistory.rightName]
        : (typeof getSelectedStructureNames === "function" ? getSelectedStructureNames() : ["SWARE", "QuIT"]);
    const metrics = getComparisonMetricsByStructure();
    const leftName = metrics[selectedStructures[0]] ? metrics[selectedStructures[0]].title : selectedStructures[0];
    const rightName = metrics[selectedStructures[1]] ? metrics[selectedStructures[1]].title : selectedStructures[1];

    const leftLabel = document.getElementById("lsm-cmpct-pp-1-legend");
    const rightLabel = document.getElementById("lsm-cmpct-pp-2-legend");
    const leftBox = document.getElementById("comparison-legend-1-box");
    const rightBox = document.getElementById("comparison-legend-2-box");

    if (leftLabel) {
        leftLabel.innerHTML = "<b>" + leftName + "</b>";
    }
    if (rightLabel) {
        rightLabel.innerHTML = "<b>" + rightName + "</b>";
    }
    if (leftBox) {
        const leftColor = getStructureChartColor(selectedStructures[0]);
        leftBox.style.backgroundColor = leftColor;
        leftBox.style.borderColor = leftColor;
    }
    if (rightBox) {
        const rightColor = getStructureChartColor(selectedStructures[1]);
        rightBox.style.backgroundColor = rightColor;
        rightBox.style.borderColor = rightColor;
    }
}

function clearComparisonCharts()
{
    const chartIds = [
        "comparison-top-inserts-chart",
        "comparison-fast-inserts-chart",
        "comparison-fast-path-resets-chart"
    ];
    for (const chartId of chartIds) {
        const chartElement = document.getElementById(chartId);
        if (chartElement) {
            chartElement.innerHTML = "";
        }
    }
}

function buildComparisonChartData(leftName, rightName, leftHistory, rightHistory)
{
    const rowCount = Math.max(
        Array.isArray(leftHistory) ? leftHistory.length : 0,
        Array.isArray(rightHistory) ? rightHistory.length : 0
    );
    const plotData = [['Operation Steps', leftName, rightName]];
    if (rowCount > 0) {
        plotData.push([0, 0, 0]);
    }
    for (let i = 0; i < rowCount; i++) {
        plotData.push([
            i + 1,
            Array.isArray(leftHistory) && typeof leftHistory[i] === "number" ? leftHistory[i] : 0,
            Array.isArray(rightHistory) && typeof rightHistory[i] === "number" ? rightHistory[i] : 0
        ]);
    }
    return plotData;
}

function drawComparisonChart(chartElementId, chartTitle, yAxisTitle, leftName, rightName, leftHistory, rightHistory)
{
    const chartElement = document.getElementById(chartElementId);
    if (!chartElement) {
        return;
    }

    const plotData = buildComparisonChartData(leftName, rightName, leftHistory, rightHistory);
    if (plotData.length <= 1) {
        return;
    }

    const data = google.visualization.arrayToDataTable(plotData);
    const maxValue = Math.max(getHistoryMax(leftHistory), getHistoryMax(rightHistory), 1);
    const stepCount = Math.max(
        Array.isArray(leftHistory) ? leftHistory.length : 0,
        Array.isArray(rightHistory) ? rightHistory.length : 0
    );
    const selectedStructures = (typeof comparisonChartHistory !== "undefined" && comparisonChartHistory)
        ? [comparisonChartHistory.leftName, comparisonChartHistory.rightName]
        : (typeof getSelectedStructureNames === "function" ? getSelectedStructureNames() : ["SWARE", "QuIT"]);

    const options = {
        title: chartTitle,
        hAxis: {
            title: 'Operation Steps',
            minValue: 0,
            maxValue: stepCount,
            ticks: 1,
            viewWindowMode: 'explicit',
            viewWindow: {min: 0, max: Math.max(stepCount, 1)}
        },
        vAxis: {
            title: yAxisTitle,
            minValue: 0,
            maxValue: maxValue,
            ticks: 1,
            viewWindowMode: 'explicit',
            viewWindow: {min: 0, max: maxValue}
        },
        legend: "none",
        colors: [
            getStructureChartColor(selectedStructures[0]),
            getStructureChartColor(selectedStructures[1])
        ],
        explorer: {
            zoomDelta: 0.8,
        },
        lineWidth: 2
    };

    const chart = new google.visualization.LineChart(chartElement);
    chart.draw(data, options);
}
/*
 * Update the charts
 */

function update_charts() {
    if (typeof google === "undefined" || !google.visualization) {
        return;
    }
    if (!comparisonChartHistory) {
        return;
    }

    updateComparisonLegends();

    const metrics = getComparisonMetricsByStructure();
    const leftTitle = metrics[comparisonChartHistory.leftName]
        ? metrics[comparisonChartHistory.leftName].title
        : comparisonChartHistory.leftName;
    const rightTitle = metrics[comparisonChartHistory.rightName]
        ? metrics[comparisonChartHistory.rightName].title
        : comparisonChartHistory.rightName;

    drawComparisonChart(
        "comparison-top-inserts-chart",
        "Number of Top Inserts vs. Operation Steps",
        "# of Top Inserts",
        leftTitle,
        rightTitle,
        comparisonChartHistory.topInsertsLeft,
        comparisonChartHistory.topInsertsRight
    );

    drawComparisonChart(
        "comparison-fast-inserts-chart",
        "Number of Fast Inserts vs. Operation Steps",
        "# of Fast Inserts",
        leftTitle,
        rightTitle,
        comparisonChartHistory.fastInsertsLeft,
        comparisonChartHistory.fastInsertsRight
    );

    drawComparisonChart(
        "comparison-fast-path-resets-chart",
        "Number of Fast Path Resets vs. Operation Steps",
        "# of Fast Path Resets",
        leftTitle,
        rightTitle,
        comparisonChartHistory.fastPathResetsLeft,
        comparisonChartHistory.fastPathResetsRight
    );

    /*
    Sware vs QuIT fast inserts 
    plot_data = [];
    plot_data.push(['Sware Bulk Loads', '# QuIT Fast Inserts']);
    for (let i = 0; i < quit_fast_inserts_history.length&&i<sware_bulk_loads_history.length; i++) {
        plot_data.push([sware_bulk_loads_history[i], quit_fast_inserts_history[i]]);
    }
    data = google.visualization.arrayToDataTable(plot_data);

    var options = {
        title: "Number of SWARE bulk loads vs QuIT Fast Inserts",
        hAxis: {title: 'SWARE Bulk Loads', minValue: 0, maxValue: Math.max(...sware_bulk_loads_history), ticks: 1},
        vAxis: {title: '# QuIT Fast Inserts', minValue: 0, maxValue: Math.max(...quit_fast_inserts_history), ticks: 1},
        legend: "none",
        colors: ["#FFB433"],
        explorer: { 
            zoomDelta: 0.8,
        }
    };

    var chart = new google.visualization.LineChart(document.getElementById("sware-bulk-loadsvsquit-fast-inserts-chart"));
    chart.draw(data, options);

    // Sware vs QuIT top inserts 
    plot_data = [];
    plot_data.push(['Sware Top Inserts', '# QuIT Top Inserts']);
    for (let i = 0; i < quit_top_inserts_history.length&&i<sware_top_inserts_history.length; i++) {
        plot_data.push([sware_top_inserts_history[i], quit_top_inserts_history[i]]);
    }
    data = google.visualization.arrayToDataTable(plot_data);

    var options = {
        title: "Number of SWARE Top Inserts vs QuIT Top Inserts",
        hAxis: {title: 'SWARE Top Inserts', minValue: 0, maxValue: Math.max(...sware_top_inserts_history), ticks: 1},
        vAxis: {title: '# QuIT Top Inserts', minValue: 0, maxValue: Math.max(...quit_top_inserts_history), ticks: 1},
        legend: "none",
        colors: ["#FFB433"],
        explorer: { 
            zoomDelta: 0.8,
        }
    };

    var chart = new google.visualization.LineChart(document.getElementById("sware-top-insertsvsquit-top-inserts-chart"));
    chart.draw(data, options);


    plot_data = [];
    plot_data.push(['Sware Bulk Load Percentage', '# QuIT Fast Insert Percentage']);
    for (let i = 0; i < quit_top_inserts_history.length && i < sware_top_inserts_history.length && i < quit_fast_inserts_history.length && i < sware_bulk_loads_history.length; i++) {
        plot_data.push([
            Math.floor(sware_bulk_loads_history[i] / (sware_bulk_loads_history[i]+sware_top_inserts_history[i]) * 100),
            Math.floor(quit_fast_inserts_history[i] / (quit_fast_inserts_history[i]+quit_top_inserts_history[i]) * 100)
        ]);
    }
    data = google.visualization.arrayToDataTable(plot_data);

    var options = {
        title: "Sware Bulk Load percentage vs QuIT Fast Insert percentage",
        hAxis: {title: '% SWARE Bulk Loads', minValue: 0, maxValue:100, ticks: 1},
        vAxis: {title: '% QuIT Fast Inserts', minValue: 0, maxValue: 100, ticks: 1},
        legend: "none",
        colors: ["#FFB433"],
        explorer: { 
            zoomDelta: 0.8,
        }
    };

    var chart = new google.visualization.LineChart(document.getElementById("sware-bulk-loadsvsquit-fast-inserts-chart-percent"));
    chart.draw(data, options);
    */


}
