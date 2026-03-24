const swareVisualRows = [];

function sleepSware(ms)
{
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSwareStepDelay()
{
    return Math.max(140, Math.floor(delay * 0.24));
}

function getSwareFlushStepDelay()
{
    return Math.max(720, Math.floor(delay * 1.05));
}

function cloneSwareBufferSnapshot(snapshot, pageCount)
{
    const clone = [];
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        if (Array.isArray(snapshot) && Array.isArray(snapshot[pageIndex])) {
            clone.push(snapshot[pageIndex].slice());
        }
        else {
            clone.push([]);
        }
    }
    return clone;
}

function clearSwareBufferPage(bufferState, pageIndex)
{
    if (!Array.isArray(bufferState) || !Array.isArray(bufferState[pageIndex])) {
        return;
    }
    bufferState[pageIndex] = [];
}

function clearSwareBufferSlot(bufferState, pageIndex, slotIndex)
{
    if (!Array.isArray(bufferState) || !Array.isArray(bufferState[pageIndex])) {
        return;
    }
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= bufferState[pageIndex].length) {
        return;
    }
    bufferState[pageIndex][slotIndex] = null;
}

function cloneSwareNodeGraph(node, nodeMap)
{
    if (!node) {
        return null;
    }

    const clone = new Node(node.t, node.leaf);
    clone.keys = Array.isArray(node.keys) ? node.keys.slice() : [];
    clone.n = typeof node.n === "number" ? node.n : clone.keys.length;
    nodeMap.set(node, clone);

    clone.children = Array.isArray(node.children)
        ? node.children.map((child) => {
            if (!child) {
                return null;
            }
            const childClone = cloneSwareNodeGraph(child, nodeMap);
            if (childClone) {
                childClone.parent = clone;
            }
            return childClone;
        })
        : [];
    return clone;
}

function cloneSwareTreeState(sourceTree)
{
    if (!sourceTree || !sourceTree.root) {
        return null;
    }

    const nodeMap = new Map();
    const rootClone = cloneSwareNodeGraph(sourceTree.root, nodeMap);
    for (const [originalNode, clonedNode] of nodeMap.entries()) {
        clonedNode.next = originalNode.next ? (nodeMap.get(originalNode.next) || null) : null;
    }

    const treeClone = new Sware(sourceTree.t);
    treeClone.root = rootClone;
    treeClone.tail = sourceTree.tail ? (nodeMap.get(sourceTree.tail) || rootClone) : rootClone;
    treeClone.fastInserts = sourceTree.fastInserts;
    treeClone.fastInserted = sourceTree.fastInserted;
    treeClone.lastSortedIndex = sourceTree.lastSortedIndex;
    treeClone.insertIndexX = sourceTree.insertIndexX;
    treeClone.insertIndexY = sourceTree.insertIndexY;
    treeClone.full = sourceTree.full;
    treeClone.size = sourceTree.size;
    treeClone.leafs = sourceTree.leafs;
    treeClone.internalSize = sourceTree.internalSize;
    return treeClone;
}

function isSwareFlushTrigger(tree)
{
    return !!tree &&
        typeof tree.t === "number" &&
        tree.insertIndexX === (tree.t - 1) &&
        tree.insertIndexY === (tree.t - 1);
}

function attachSwareAnimationTrace(trace, preFlushTreeState)
{
    if (!trace || !swareTree) {
        return trace;
    }

    if (trace.bufferWasFull) {
        trace.visualTreeBeforeFlush = preFlushTreeState;
        trace.bufferSnapshotAfterReset = cloneSwareBufferSnapshot(swareTree.buffer, Math.max(1, swareTree.t || 1));
        trace.lastSortedIndexAfterReset = swareTree.lastSortedIndex;
        trace.nextBufferSlotAfterReset = {
            pageIndex: swareTree.insertIndexX,
            slotIndex: swareTree.insertIndexY
        };
    }
    return trace;
}

function pushSwareFastVisualStep(trace, treeState, pageIndex)
{
    if (!trace) {
        return;
    }
    if (!Array.isArray(trace.flushVisualSteps)) {
        trace.flushVisualSteps = [];
    }
    trace.flushVisualSteps.push({
        type: "fast",
        pageIndex: pageIndex,
        treeAfter: cloneSwareTreeState(treeState)
    });
}

function pushSwareTopVisualStep(trace, treeBefore, treeAfter, pageIndex, slotIndex, page)
{
    if (!trace) {
        return;
    }
    if (!Array.isArray(trace.flushVisualSteps)) {
        trace.flushVisualSteps = [];
    }
    trace.flushVisualSteps.push({
        type: "top",
        pageIndex: pageIndex,
        slotIndex: slotIndex,
        page: page,
        treeBefore: treeBefore,
        treeAfter: treeAfter
    });
}

function getActiveSwareTree(treeState)
{
    return treeState || swareTree;
}

function buildSwareSingleLeafVisualState(t, pageValues)
{
    const treeState = new Sware(t);
    const values = Array.isArray(pageValues)
        ? pageValues.filter((value) => value != null).slice().sort((left, right) => left - right)
        : [];
    treeState.root.keys = values;
    treeState.root.n = values.length;
    treeState.tail = treeState.root;
    treeState.size = values.length;
    treeState.leafs = values.length > 0 ? 1 : treeState.leafs;
    return treeState;
}

function getSwareVisualState()
{
    if (!swareTree || !swareTree.visualState || typeof swareTree.visualState !== "object") {
        return null;
    }
    return swareTree.visualState;
}

function setSwareVisualState(state)
{
    if (!swareTree) {
        return;
    }

    if (!state) {
        swareTree.visualState = null;
        return;
    }

    swareTree.visualState = {
        activeSlot: Object.prototype.hasOwnProperty.call(state, "activeSlot") ? state.activeSlot : null,
        bufferSnapshot: Object.prototype.hasOwnProperty.call(state, "bufferSnapshot") ? state.bufferSnapshot : null,
        sortedIndex: Object.prototype.hasOwnProperty.call(state, "sortedIndex") ? state.sortedIndex : null,
        treeState: Object.prototype.hasOwnProperty.call(state, "treeState") ? state.treeState : null,
        pathNodes: Object.prototype.hasOwnProperty.call(state, "pathNodes") ? state.pathNodes : [],
        highlightFastTailDots: !!state.highlightFastTailDots
    };
}

function clearSwareVisualState()
{
    if (!swareTree) {
        return;
    }
    swareTree.visualState = null;
}

function renderCurrentSwareView()
{
    renderSwareBuffer();
    renderSwareTree();
}

function showSwareVisualState(state)
{
    setSwareVisualState(state);
    renderCurrentSwareView();
}

function sware()
{
    if (!Array.isArray(sware_data) || sware_data.length === 0) {
        return null;
    }

    const fastInsertsBefore = swareTree && typeof swareTree.fastInserts === "number"
        ? swareTree.fastInserts
        : 0;
    const topInsertsBefore = swareTree && typeof swareTree.topInserts === "number"
        ? swareTree.topInserts
        : 0;
    const sortPagesBefore = swareTree && typeof swareTree.sortPages === "number"
        ? swareTree.sortPages
        : 0;
    const preFlushTreeState = isSwareFlushTrigger(swareTree)
        ? cloneSwareTreeState(swareTree)
        : null;
    const page = sware_data[0];
    swareTree.insert(page);
    sware_data.shift();
    const trace = attachSwareAnimationTrace(swareTree.lastInsertInfo || null, preFlushTreeState);
    if (trace) {
        trace.fastInsertsBefore = fastInsertsBefore;
        trace.topInsertsBefore = topInsertsBefore;
        trace.sortPagesBefore = sortPagesBefore;
        trace.fastInsertsAfter = swareTree && typeof swareTree.fastInserts === "number"
            ? swareTree.fastInserts
            : fastInsertsBefore;
        trace.topInsertsAfter = swareTree && typeof swareTree.topInserts === "number"
            ? swareTree.topInserts
            : topInsertsBefore;
        trace.sortPagesAfter = swareTree && typeof swareTree.sortPages === "number"
            ? swareTree.sortPages
            : sortPagesBefore;
    }
    return trace;
}

async function animateSwarePhase()
{
    const trace = sware();
    if (!trace) {
        clearSwareVisualState();
        renderCurrentSwareView();
        return null;
    }

    let previewFastInserts = Number.isInteger(trace.fastInsertsBefore)
        ? trace.fastInsertsBefore
        : (swareTree && typeof swareTree.fastInserts === "number" ? swareTree.fastInserts : 0);
    let previewTopInserts = Number.isInteger(trace.topInsertsBefore)
        ? trace.topInsertsBefore
        : (swareTree && typeof swareTree.topInserts === "number" ? swareTree.topInserts : 0);
    let previewSortPages = Number.isInteger(trace.sortPagesBefore)
        ? trace.sortPagesBefore
        : (swareTree && typeof swareTree.sortPages === "number" ? swareTree.sortPages : 0);
    const updateSwareMetricPreview = () => {
        if (typeof setSwareComparisonPreview !== "function") {
            return;
        }
        setSwareComparisonPreview({
            fastInserts: previewFastInserts,
            topInserts: previewTopInserts,
            sortPages: previewSortPages
        });
    };

    updateSwareMetricPreview();

    let flushDelay = 0;
    let flushHighlightActive = false;
    if (trace.bufferWasFull && typeof setAlgorithmBoxFlushing === "function") {
        setAlgorithmBoxFlushing("sware-box", true);
        flushHighlightActive = true;
    }

    try {
        const stepDelay = getSwareStepDelay();
        if (!trace.bufferWasFull) {
            showSwareVisualState({
                activeSlot: {
                    pageIndex: trace.bufferSlot.pageIndex,
                    slotIndex: trace.bufferSlot.slotIndex,
                    mode: "regular"
                },
                bufferSnapshot: null,
                sortedIndex: null,
                treeState: null,
                pathNodes: [],
                highlightFastTailDots: false
            });
            await sleepSware(stepDelay);
        }
        else {
            flushDelay = getSwareFlushStepDelay();
            const visualSteps = Array.isArray(trace.flushVisualSteps) ? trace.flushVisualSteps : [];
            const pageCount = Math.max(1, swareTree ? (swareTree.t || 1) : 1);
            const workingSnapshot = cloneSwareBufferSnapshot(trace.bufferSnapshotBeforeReset, pageCount);
            const postResetSnapshot = cloneSwareBufferSnapshot(trace.bufferSnapshotAfterReset, pageCount);
            const sortedIndexBeforeReset = Number.isInteger(trace.lastSortedIndexBeforeReset)
                ? trace.lastSortedIndexBeforeReset
                : (swareTree ? swareTree.lastSortedIndex : 0);
            const sortedIndexAfterReset = Number.isInteger(trace.lastSortedIndexAfterReset)
                ? trace.lastSortedIndexAfterReset
                : (swareTree ? swareTree.lastSortedIndex : 0);
            const firstVisualStep = visualSteps.length > 0 ? visualSteps[0] : null;
            const initialTreeState = (firstVisualStep && firstVisualStep.treeBefore)
                || trace.visualTreeBeforeFlush
                || cloneSwareTreeState(swareTree);

            if (visualSteps.length === 0) {
                showSwareVisualState({
                    activeSlot: null,
                    bufferSnapshot: postResetSnapshot,
                    sortedIndex: sortedIndexAfterReset,
                    treeState: swareTree,
                    pathNodes: [],
                    highlightFastTailDots: false
                });
                await sleepSware(flushDelay);
            }
            else {
                showSwareVisualState({
                    activeSlot: null,
                    bufferSnapshot: workingSnapshot,
                    sortedIndex: sortedIndexBeforeReset,
                    treeState: initialTreeState,
                    pathNodes: [],
                    highlightFastTailDots: false
                });
                await sleepSware(Math.max(180, Math.floor(flushDelay * 0.35)));

                let currentPageIndex = null;
                let currentTreeState = initialTreeState;
                for (let stepIndex = 0; stepIndex < visualSteps.length; stepIndex++) {
                    const step = visualSteps[stepIndex];
                    const nextStep = stepIndex + 1 < visualSteps.length
                        ? visualSteps[stepIndex + 1]
                        : null;
                    const pageChanged = currentPageIndex !== step.pageIndex;
                    const treeBefore = step.treeBefore || currentTreeState || initialTreeState;
                    const treeAfter = step.treeAfter || treeBefore;

                    if (pageChanged) {
                        currentPageIndex = step.pageIndex;
                        showSwareVisualState({
                            activeSlot: {
                                pageIndex: step.pageIndex,
                                mode: "flush-page"
                            },
                            bufferSnapshot: workingSnapshot,
                            sortedIndex: sortedIndexBeforeReset,
                            treeState: treeBefore,
                            pathNodes: [],
                            highlightFastTailDots: false
                        });
                        await sleepSware(Math.max(260, Math.floor(flushDelay * 0.42)));
                    }

                    if (step.type === "fast") {
                        showSwareVisualState({
                            activeSlot: {
                                pageIndex: step.pageIndex,
                                mode: "flush-page"
                            },
                            bufferSnapshot: workingSnapshot,
                            sortedIndex: sortedIndexBeforeReset,
                            treeState: treeBefore,
                            pathNodes: [],
                            highlightFastTailDots: true
                        });
                        await sleepSware(flushDelay);
                        clearSwareBufferPage(workingSnapshot, step.pageIndex);
                        showSwareVisualState({
                            activeSlot: null,
                            bufferSnapshot: workingSnapshot,
                            sortedIndex: sortedIndexBeforeReset,
                            treeState: treeAfter,
                            pathNodes: [],
                            highlightFastTailDots: false
                        });
                        previewFastInserts += 1;
                        updateSwareMetricPreview();
                        await sleepSware(Math.max(260, Math.floor(flushDelay * 0.42)));
                        currentTreeState = treeAfter;
                        currentPageIndex = null;
                        continue;
                    }

                    const slotIndex = Number.isInteger(step.slotIndex) ? step.slotIndex : 0;
                    const path = findSwarePath(step.page, treeBefore);
                    showSwareVisualState({
                        activeSlot: {
                            pageIndex: step.pageIndex,
                            slotIndex: slotIndex,
                            mode: "flush-slot"
                        },
                        bufferSnapshot: workingSnapshot,
                        sortedIndex: sortedIndexBeforeReset,
                        treeState: treeBefore,
                        pathNodes: path,
                        highlightFastTailDots: false
                    });
                    await sleepSware(Math.max(380, Math.floor(flushDelay * 0.6)));
                    clearSwareBufferSlot(workingSnapshot, step.pageIndex, slotIndex);
                    showSwareVisualState({
                        activeSlot: {
                            pageIndex: step.pageIndex,
                            mode: "flush-page"
                        },
                        bufferSnapshot: workingSnapshot,
                        sortedIndex: sortedIndexBeforeReset,
                        treeState: treeAfter,
                        pathNodes: [],
                        highlightFastTailDots: false
                    });
                    previewTopInserts += 1;
                    updateSwareMetricPreview();
                    await sleepSware(Math.max(320, Math.floor(flushDelay * 0.5)));

                    const pageFinished = !nextStep || nextStep.pageIndex !== step.pageIndex;
                    if (pageFinished) {
                        clearSwareBufferPage(workingSnapshot, step.pageIndex);
                        showSwareVisualState({
                            activeSlot: null,
                            bufferSnapshot: workingSnapshot,
                            sortedIndex: sortedIndexBeforeReset,
                            treeState: treeAfter,
                            pathNodes: [],
                            highlightFastTailDots: false
                        });
                        await sleepSware(Math.max(240, Math.floor(flushDelay * 0.34)));
                        currentPageIndex = null;
                    }
                    currentTreeState = treeAfter;
                }

                showSwareVisualState({
                    activeSlot: null,
                    bufferSnapshot: postResetSnapshot,
                    sortedIndex: sortedIndexAfterReset,
                    treeState: swareTree,
                    pathNodes: [],
                    highlightFastTailDots: false
                });
                previewSortPages = Number.isInteger(trace.sortPagesAfter) ? trace.sortPagesAfter : previewSortPages;
                updateSwareMetricPreview();
                await sleepSware(Math.max(stepDelay, Math.floor(flushDelay * 0.7)));
            }
        }

        clearSwareVisualState();
        renderCurrentSwareView();
    }
    finally {
        if (flushHighlightActive && typeof setAlgorithmBoxFlushing === "function") {
            await sleepSware(Math.max(260, Math.floor(flushDelay * 0.45)));
            setAlgorithmBoxFlushing("sware-box", false);
        }
    }

    return trace;
}

function initializeSwareVisualization()
{
    clearSwareVisualState();
    renderCurrentSwareView();
}

function renderSwareBuffer(activeSlot, bufferSnapshot, sortedIndexSnapshot)
{
    const bufferGrid = document.getElementById("sware-buffer-grid");
    if (!bufferGrid || !swareTree) {
        return;
    }

    const visualState = getSwareVisualState();
    const pageCount = Math.max(1, swareTree.t || 1);
    const pageCapacity = pageCount;
    const resolvedActiveSlot = activeSlot || (visualState ? visualState.activeSlot : null);
    const bufferSource = Array.isArray(bufferSnapshot)
        ? bufferSnapshot
        : (visualState && Array.isArray(visualState.bufferSnapshot) ? visualState.bufferSnapshot : swareTree.buffer);
    const sortedIndex = Number.isInteger(sortedIndexSnapshot)
        ? sortedIndexSnapshot
        : (visualState && Number.isInteger(visualState.sortedIndex) ? visualState.sortedIndex : swareTree.lastSortedIndex);

    bufferGrid.setAttribute("data-sware-layout", "grid");
    bufferGrid.innerHTML = "";

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        const page = document.createElement("div");
        page.className = "sware-buffer-page";

        const row = Array.isArray(bufferSource[pageIndex]) ? bufferSource[pageIndex] : [];
        const hasValues = row.some((value) => value != null);
        if (hasValues) {
            if (pageIndex <= sortedIndex) {
                page.classList.add("sware-page-sorted");
            }
            else {
                page.classList.add("sware-page-unsorted");
            }
        }

        const label = document.createElement("div");
        label.className = "sware-buffer-page-label";
        label.textContent = "P" + pageIndex;
        page.appendChild(label);

        const slots = document.createElement("div");
        slots.className = "sware-buffer-page-slots";
        for (let slotIndex = 0; slotIndex < pageCapacity; slotIndex++) {
            const slot = document.createElement("button");
            slot.className = "btn btn-primary buffer-btn";
            slot.id = "buffer" + ((pageIndex * pageCapacity) + slotIndex);

            const value = (slotIndex < row.length && row[slotIndex] != null) ? row[slotIndex] : null;
            if (value == null) {
                slot.textContent = ".";
                slot.classList.add("sware-buffer-empty");
            }
            else {
                slot.textContent = value;
            }

            const isActive = !!resolvedActiveSlot &&
                resolvedActiveSlot.pageIndex === pageIndex &&
                resolvedActiveSlot.slotIndex === slotIndex;
            const isFlushPage = !!resolvedActiveSlot &&
                resolvedActiveSlot.pageIndex === pageIndex &&
                (resolvedActiveSlot.mode === "flush-page" || resolvedActiveSlot.mode === "flush-slot");
            if (isFlushPage) {
                page.classList.add("sware-page-flushing");
            }
            if (isActive) {
                if (resolvedActiveSlot.mode === "flush-slot") {
                    slot.classList.add("sware-buffer-flushing-slot");
                }
                else {
                    slot.classList.add("sware-buffer-active");
                }
            }

            slots.appendChild(slot);
        }
        page.appendChild(slots);
        bufferGrid.appendChild(page);
    }
}

function getSwareNodeKeys(node)
{
    if (!node || !Array.isArray(node.keys)) {
        return [];
    }

    let keyCount = node.keys.length;
    if (node.leaf && typeof node.n === "number") {
        keyCount = Math.min(node.n, node.keys.length);
    }
    return node.keys.slice(0, keyCount);
}

function getSwareNodeChildren(node)
{
    if (!node || !Array.isArray(node.children)) {
        return [];
    }
    return node.children.filter((child) => child != null);
}

function collectSwareLevels(treeState)
{
    const activeTree = getActiveSwareTree(treeState);
    if (!activeTree || !activeTree.root) {
        return [];
    }

    const levels = [];
    let current = [activeTree.root];
    while (current.length > 0) {
        levels.push(current);
        const next = [];
        for (const node of current) {
            if (!node || node.leaf) {
                continue;
            }
            const children = getSwareNodeChildren(node);
            for (const child of children) {
                next.push(child);
            }
        }
        current = next;
    }
    return levels;
}

function computeSwareRanges(node, rangeMap)
{
    if (!node) {
        return [null, null];
    }

    const keys = getSwareNodeKeys(node);
    if (node.leaf) {
        const range = keys.length > 0
            ? [keys[0], keys[keys.length - 1]]
            : [null, null];
        rangeMap.set(node, range);
        return range;
    }

    const children = getSwareNodeChildren(node);
    let minChild = null;
    let maxChild = null;
    for (const child of children) {
        const childRange = computeSwareRanges(child, rangeMap);
        if (childRange[0] != null && minChild == null) {
            minChild = childRange[0];
        }
        if (childRange[1] != null) {
            maxChild = childRange[1];
        }
    }
    const range = [minChild, maxChild];
    rangeMap.set(node, range);
    return range;
}

function formatSwareRange(range)
{
    if (!range || range[0] == null || range[1] == null) {
        return "[-, -]";
    }
    return "[" + range[0] + ", " + range[1] + "]";
}

function getSwareNodeCapacity(node, treeState)
{
    if (!node) {
        return 1;
    }

    const keys = getSwareNodeKeys(node);
    const fallbackCapacity = (typeof node.t === "number" && node.t > 0)
        ? node.t
        : Math.max(keys.length, 1);
    const activeTree = getActiveSwareTree(treeState);
    if (!activeTree) {
        return fallbackCapacity;
    }

    const treeCapacity = node.leaf ? activeTree.t : activeTree.internalSize;
    if (typeof treeCapacity !== "number" || treeCapacity < 1) {
        return Math.max(1, keys.length, fallbackCapacity);
    }

    return Math.max(1, treeCapacity, keys.length);
}

function getSwareDisplayKeys(node)
{
    return getSwareNodeKeys(node);
}

function getSwareKeyColumnCount(slotCount)
{
    if (!Number.isFinite(slotCount) || slotCount < 1) {
        return 1;
    }
    return Math.min(slotCount, 6);
}

function createSwareNodeCard(node, depth, range, isPathNode, isTailNode, hasLeafNextPointer, displayKeys, treeState)
{
    const keys = Array.isArray(displayKeys) ? displayKeys : getSwareDisplayKeys(node);
    const slotCount = Math.max(keys.length, 1);
    const keyColumns = getSwareKeyColumnCount(slotCount);
    const keyRows = Math.max(1, Math.ceil(slotCount / keyColumns));

    const card = document.createElement("div");
    card.className = "quit-node-card";
    card.classList.add(node.leaf ? "leaf" : "internal");
    if (depth === 0) {
        card.classList.add("root");
    }
    if (isPathNode) {
        card.classList.add("quit-path-active");
    }
    if (isTailNode) {
        card.classList.add("sware-tail-node");
    }

    const header = document.createElement("div");
    header.className = "quit-node-header";
    let headerLabel = depth === 0 ? "Root" : (node.leaf ? "Leaf" : "Internal");
    if (isTailNode && node.leaf && depth !== 0) {
        headerLabel += " (tail)";
    }
    header.textContent = headerLabel;

    const rangeLabel = document.createElement("div");
    rangeLabel.className = "quit-node-range";
    rangeLabel.textContent = formatSwareRange(range);

    const keyRow = document.createElement("div");
    keyRow.className = "quit-node-keys";
    keyRow.style.setProperty("--quit-key-columns", keyColumns.toString());
    keyRow.style.setProperty("--quit-key-rows", keyRows.toString());
    for (let i = 0; i < slotCount; i++) {
        const keyCell = document.createElement("span");
        keyCell.className = "quit-key-cell";
        if (i < keys.length) {
            keyCell.textContent = keys[i];
        }
        else {
            keyCell.textContent = "·";
            keyCell.classList.add("quit-key-empty");
        }
        keyRow.appendChild(keyCell);
    }

    card.appendChild(header);
    card.appendChild(rangeLabel);
    card.appendChild(keyRow);

    if (node.leaf && hasLeafNextPointer) {
        const leafPointer = document.createElement("div");
        leafPointer.className = "quit-leaf-pointer";
        leafPointer.textContent = "NEXT →";
        card.appendChild(leafPointer);
    }
    return card;
}

function createSwareEllipsisCard(isPathNode)
{
    const card = document.createElement("div");
    card.className = "quit-node-ellipsis";
    if (isPathNode) {
        card.classList.add("quit-ellipsis-path-active");
    }
    card.textContent = "...";
    return card;
}

function createSwareDotsNodeCard(isPathNode, highlightFast)
{
    const card = createSwareEllipsisCard(isPathNode);
    card.classList.add("sware-tail-dots-card");
    if (highlightFast) {
        card.classList.add("sware-tail-dots-fast");
    }
    return card;
}

function createSwareLayerEllipsisCard(isPathNode, hiddenLayerCount)
{
    const card = document.createElement("div");
    card.className = "quit-node-ellipsis quit-layer-ellipsis";
    if (isPathNode) {
        card.classList.add("quit-ellipsis-path-active");
    }
    card.style.setProperty("--quit-layer-span", Math.max(1, hiddenLayerCount).toString());

    const dots = document.createElement("div");
    dots.className = "quit-layer-dot-stack";
    for (let i = 0; i < 3; i++) {
        const line = document.createElement("span");
        line.className = "quit-layer-dot-line";
        line.textContent = "...";
        dots.appendChild(line);
    }
    card.appendChild(dots);
    return card;
}

function compressSwareInternalLevel(nodes, focusNode)
{
    if (!nodes || nodes.length === 0) {
        return [];
    }
    if (nodes.length <= 5) {
        return nodes.map((node) => ({ type: "node", node: node }));
    }

    const middleIndex = Math.floor((nodes.length - 1) / 2);
    const items = [{ type: "node", node: nodes[0] }];
    if (middleIndex > 1) {
        items.push({ type: "ellipsis-range", start: 1, end: middleIndex - 1 });
    }
    items.push({ type: "node", node: nodes[middleIndex] });
    if (middleIndex < nodes.length - 2) {
        items.push({ type: "ellipsis-range", start: middleIndex + 1, end: nodes.length - 2 });
    }
    items.push({ type: "node", node: nodes[nodes.length - 1] });
    return items;
}

function compressSwareLeafLevel(nodes, pathSet, focusNode)
{
    const items = [];
    if (!nodes || nodes.length === 0) {
        items.push({ type: "tail-dots" });
        return items;
    }

    const focusIndex = nodes.indexOf(focusNode);
    if (focusIndex > 0 && focusIndex < (nodes.length - 1)) {
        const keepIndexes = [0, focusIndex, nodes.length - 1];
        let previousIndex = null;
        for (const keepIndex of keepIndexes) {
            if (previousIndex != null && keepIndex - previousIndex > 1) {
                let ellipsisPath = false;
                for (let index = previousIndex + 1; index < keepIndex; index++) {
                    if (pathSet.has(nodes[index])) {
                        ellipsisPath = true;
                        break;
                    }
                }
                items.push({ type: "dots-node", isPathNode: ellipsisPath });
            }
            items.push({ type: "node", node: nodes[keepIndex] });
            previousIndex = keepIndex;
        }
        items.push({ type: "tail-dots" });
        return items;
    }

    items.push({ type: "node", node: nodes[0] });
    if (nodes.length > 1) {
        let ellipsisPath = false;
        for (let index = 1; index < nodes.length - 1; index++) {
            if (pathSet.has(nodes[index])) {
                ellipsisPath = true;
                break;
            }
        }
        items.push({ type: "dots-node", isPathNode: ellipsisPath });
        items.push({ type: "node", node: nodes[nodes.length - 1] });
    }

    items.push({ type: "tail-dots" });
    return items;
}

function hasVisibleNextLeafSware(displayItems, currentIndex)
{
    for (let i = currentIndex + 1; i < displayItems.length; i++) {
        if (displayItems[i].type === "node") {
            return true;
        }
    }
    return false;
}

function isSwareLayerEllipsisOnPath(startLevel, endLevel, levels, pathSet)
{
    if (!levels || !pathSet || pathSet.size === 0) {
        return false;
    }
    for (let level = startLevel; level <= endLevel && level < levels.length; level++) {
        const nodes = levels[level] || [];
        for (const node of nodes) {
            if (pathSet.has(node)) {
                return true;
            }
        }
    }
    return false;
}

function getSwareDisplayRows(levels, insertionPath, pathSet)
{
    const displayRows = [];
    if (!levels || levels.length === 0) {
        return displayRows;
    }

    if (levels.length > 3) {
        displayRows.push({
            type: "level",
            levelIndex: 0,
            levelNodes: levels[0],
            items: compressSwareInternalLevel(levels[0], null)
        });
        displayRows.push({
            type: "layer-ellipsis",
            startLevel: 1,
            endLevel: levels.length - 2,
            isPathNode: isSwareLayerEllipsisOnPath(1, levels.length - 2, levels, pathSet)
        });
        displayRows.push({
            type: "level",
            levelIndex: levels.length - 1,
            levelNodes: levels[levels.length - 1],
            items: compressSwareLeafLevel(
                levels[levels.length - 1],
                pathSet,
                insertionPath[levels.length - 1] || null
            )
        });
        return displayRows;
    }

    for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
        const levelNodes = levels[levelIndex];
        const isLeafLevel = levelNodes.length > 0 && levelNodes[0].leaf;
        displayRows.push({
            type: "level",
            levelIndex: levelIndex,
            levelNodes: levelNodes,
            items: isLeafLevel
                ? compressSwareLeafLevel(levelNodes, pathSet, insertionPath[levelIndex] || null)
                : compressSwareInternalLevel(levelNodes, null)
        });
    }
    return displayRows;
}

function renderSwareTree(pathNodes, highlightFastTailDots, treeState)
{
    const visualState = getSwareVisualState();
    const activeTree = getActiveSwareTree(treeState || (visualState ? visualState.treeState : null));
    const swareGrid = document.getElementById("sware-tree-grid");
    if (!swareGrid || !activeTree || !activeTree.root) {
        return;
    }

    const levels = collectSwareLevels(activeTree);
    const resolvedPathNodes = Array.isArray(pathNodes)
        ? pathNodes
        : (visualState && Array.isArray(visualState.pathNodes) ? visualState.pathNodes : []);
    const resolvedHighlightFastTailDots = typeof highlightFastTailDots === "boolean"
        ? highlightFastTailDots
        : !!(visualState && visualState.highlightFastTailDots);
    const pathSet = new Set(resolvedPathNodes || []);
    const displayRows = getSwareDisplayRows(levels, resolvedPathNodes || [], pathSet);
    const nodeSlotMap = new Map();
    const rangeMap = new Map();
    computeSwareRanges(activeTree.root, rangeMap);

    while (swareVisualRows.length < displayRows.length) {
        const row = document.createElement("div");
        row.className = "quit-tree-row";
        swareGrid.appendChild(row);
        swareVisualRows.push({ row: row, slots: [] });
    }

    for (let rowIndex = 0; rowIndex < displayRows.length; rowIndex++) {
        const rowData = swareVisualRows[rowIndex];
        const row = rowData.row;
        const rowInfo = displayRows[rowIndex];

        row.classList.remove("hidden");
        row.classList.remove("quit-row-layer-ellipsis");

        if (rowInfo.type === "layer-ellipsis") {
            row.classList.add("quit-row-layer-ellipsis");
            row.style.setProperty("--quit-cols", "1");

            while (rowData.slots.length < 1) {
                const slot = document.createElement("div");
                slot.className = "quit-node-slot hidden";
                row.appendChild(slot);
                rowData.slots.push(slot);
            }

            for (let slotIndex = 0; slotIndex < rowData.slots.length; slotIndex++) {
                const slot = rowData.slots[slotIndex];
                if (slotIndex > 0) {
                    slot.classList.add("hidden");
                    slot.innerHTML = "";
                    continue;
                }
                slot.classList.remove("hidden");
                slot.innerHTML = "";
                const hiddenLayerCount = (rowInfo.endLevel - rowInfo.startLevel) + 1;
                slot.appendChild(createSwareLayerEllipsisCard(rowInfo.isPathNode, hiddenLayerCount));
            }
            continue;
        }

        const levelIndex = rowInfo.levelIndex;
        const levelNodes = rowInfo.levelNodes;
        const displayItems = rowInfo.items;
        const isLeafLevel = levelNodes.length > 0 && levelNodes[0].leaf;
        row.style.setProperty("--quit-cols", Math.max(displayItems.length, 1));

        while (rowData.slots.length < displayItems.length) {
            const slot = document.createElement("div");
            slot.className = "quit-node-slot hidden";
            row.appendChild(slot);
            rowData.slots.push(slot);
        }

        for (let slotIndex = 0; slotIndex < rowData.slots.length; slotIndex++) {
            const slot = rowData.slots[slotIndex];
            if (slotIndex >= displayItems.length) {
                slot.classList.add("hidden");
                slot.innerHTML = "";
                continue;
            }

            const item = displayItems[slotIndex];
            slot.classList.remove("hidden");
            slot.innerHTML = "";

            if (item.type === "ellipsis-range") {
                let ellipsisPath = false;
                for (let idx = item.start; idx <= item.end && idx < levelNodes.length; idx++) {
                    if (pathSet.has(levelNodes[idx])) {
                        ellipsisPath = true;
                        break;
                    }
                }
                slot.appendChild(createSwareEllipsisCard(ellipsisPath));
                continue;
            }

            if (item.type === "ellipsis") {
                slot.appendChild(createSwareEllipsisCard(!!item.isPathNode));
                continue;
            }

            if (item.type === "dots-node") {
                slot.appendChild(createSwareDotsNodeCard(!!item.isPathNode, false));
                continue;
            }

            if (item.type === "tail-dots") {
                slot.appendChild(createSwareDotsNodeCard(false, resolvedHighlightFastTailDots));
                continue;
            }

            const node = item.node;
            const displayKeys = getSwareDisplayKeys(node);
            const card = createSwareNodeCard(
                node,
                levelIndex,
                rangeMap.get(node),
                pathSet.has(node),
                node === activeTree.tail,
                isLeafLevel && hasVisibleNextLeafSware(displayItems, slotIndex),
                displayKeys,
                activeTree
            );
            slot.appendChild(card);
            nodeSlotMap.set(node, slot);
        }
    }

    for (let rowIndex = displayRows.length; rowIndex < swareVisualRows.length; rowIndex++) {
        const rowData = swareVisualRows[rowIndex];
        rowData.row.classList.add("hidden");
        rowData.row.classList.remove("quit-row-layer-ellipsis");
        for (const slot of rowData.slots) {
            slot.classList.add("hidden");
            slot.innerHTML = "";
        }
    }

    requestAnimationFrame(() => {
        drawSwareConnections(levels, nodeSlotMap, resolvedPathNodes);
    });
}

function drawSwareConnections(levels, nodeSlotMap, pathNodes)
{
    const swareGrid = document.getElementById("sware-tree-grid");
    const linkLayer = document.getElementById("sware-tree-links");
    if (!swareGrid || !linkLayer) {
        return;
    }

    const gridRect = swareGrid.getBoundingClientRect();
    const layerWidth = Math.max(swareGrid.scrollWidth, swareGrid.clientWidth);
    const layerHeight = Math.max(swareGrid.scrollHeight, swareGrid.clientHeight);
    linkLayer.setAttribute("width", layerWidth.toString());
    linkLayer.setAttribute("height", layerHeight.toString());
    linkLayer.setAttribute("viewBox", "0 0 " + layerWidth + " " + layerHeight);
    linkLayer.innerHTML = "";

    if (!levels || levels.length <= 1) {
        return;
    }

    const pathSet = new Set(pathNodes || []);
    for (let level = 0; level < levels.length - 1; level++) {
        const parents = levels[level];
        for (const parent of parents) {
            const parentSlot = nodeSlotMap.get(parent);
            if (!parentSlot) {
                continue;
            }

            const parentRect = parentSlot.getBoundingClientRect();
            const parentX = (parentRect.left - gridRect.left) + (parentRect.width / 2);
            const parentY = (parentRect.top - gridRect.top) + parentRect.height;
            const children = getSwareNodeChildren(parent);
            for (const child of children) {
                const childSlot = nodeSlotMap.get(child);
                if (!childSlot) {
                    continue;
                }

                const childRect = childSlot.getBoundingClientRect();
                const childX = (childRect.left - gridRect.left) + (childRect.width / 2);
                const childY = (childRect.top - gridRect.top);

                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", "M " + parentX + " " + parentY + " L " + childX + " " + childY);
                let pathClass = "quit-tree-link-path";
                if (pathSet.has(parent) && pathSet.has(child)) {
                    pathClass += " quit-tree-link-path-active";
                }
                path.setAttribute("class", pathClass);
                linkLayer.appendChild(path);
            }
        }
    }
}

function findSwarePath(page, treeState)
{
    const path = [];
    const activeTree = getActiveSwareTree(treeState);
    let node = activeTree ? activeTree.root : null;
    while (node) {
        path.push(node);
        if (node.leaf) {
            break;
        }

        const keys = getSwareNodeKeys(node);
        let childIndex = 0;
        while (childIndex < keys.length && page >= keys[childIndex]) {
            childIndex++;
        }
        node = node.children[childIndex] || null;
    }
    return path;
}

class Sware {
    constructor(t) {
        this.t = t;
        this.internalSize = calculate_internal(t);
        this.root = new Node(t, true);
        this.tail = this.root;
        this.fastInserts = 0;
        this.fastInserted = true;
        this.topInserts = 0;
        this.lastSortedIndex = 0;
        this.insertIndexX = 0;
        this.insertIndexY = 0;
        this.buffer = [];
        this.bufferDict = [];
        this.tempArray = [];
        this.full = false;
        this.size = 0;
        this.bufferFlushes = 0;
        this.leafs = 1;
        this.lastInsertInfo = null;
        this.visualState = null;
        this.sortPages = 0;
        this.avgPages = 0;
        this.totalPagesFlushed = 0;
        for(let i = 0;i<t;i++)
        {
            this.buffer.push([]);
            this.bufferDict.push([]);
        }
    }
    insert(page)
    {
        this.size++;
        const insertTrace = {
            inputPage: page,
            bufferSlot: {
                pageIndex: this.insertIndexX,
                slotIndex: this.insertIndexY
            },
            bufferWasFull: false,
            flushEvents: [],
            flushVisualSteps: [],
            fastInsertOccurred: false,
            topInsertOccurred: false,
            bufferSnapshotBeforeReset: null,
            lastSortedIndexBeforeReset: this.lastSortedIndex
        };
        let pageLeaf = this.root;
        let temp;
        let stop;
        let tempNode;
        let testNode;
        let newTail;
        this.load(page);
        if(this.full)
        {
            insertTrace.bufferWasFull = true;
            console.log("tail leaf:", JSON.stringify(this.tail.keys));
            console.log(JSON.stringify(this.buffer));
            console.log("fast inserts:", this.fastInserts);
            this.insertIndexX = this.t-Math.min(this.lastSortedIndex,Math.floor((this.t/2)-1))-1;
            this.insertIndexY = 0;
            this.full = false;
            if(!this.root.leaf)
            {
                for(let i = 0;i<=this.lastSortedIndex&&i<=Math.floor((this.t/2)-1);i++)
                {
                    // fast insert check
                    if(this.bufferDict[i][0]>=this.tail.keys[this.tail.n-1])
                    {
                        insertTrace.fastInsertOccurred = true;
                        insertTrace.flushEvents.push({
                            type: "fast",
                            pageIndex: i,
                            page: this.buffer[i][0]
                        });
                        console.log("test");
                        this.buffer[i].sort((a,b)=>a-b);
                        this.tail.parent.keys.push(this.buffer[i][0]);
                        newTail = new Node(this.t,true);
                        this.leafs++;
                        //this.size+=this.t;
                        newTail.n=this.t;
                        newTail.keys = [...this.buffer[i]];
                        this.tail.next = newTail;
                        newTail.parent = this.tail.parent;
                        this.tail.parent.children.push(newTail);
                        this.tail.parent.n++;
                        tempNode = this.tail.parent;
                        while(tempNode.n>tempNode.t)
                            tempNode = this.split(tempNode);
                        pageLeaf = this.root;
                        this.tail = newTail;
                        this.fastInserts+=10;
                        this.fastInserted = true;
                        pushSwareFastVisualStep(insertTrace, this, i);
                    }
                    else
                    {
                        this.fastInserted = false;
                        //break page up and top insert
                        for(let j = 0;j<this.t;j++)
                        {
                            this.topInserts++;
                            //this.size++;
                            page = this.buffer[i][j];
                            insertTrace.topInsertOccurred = true;
                            const topTreeBefore = cloneSwareTreeState(this);
                            insertTrace.flushEvents.push({
                                type: "top",
                                pageIndex: i,
                                slotIndex: j,
                                page: page
                            });
                            pageLeaf = this.root;
                            while(!(pageLeaf.leaf))
                            {
                                stop = false;
                                for(let i = 0;i<pageLeaf.keys.length&&!stop;i++)
                                {
                                    if(page<pageLeaf.keys[i])
                                    {
                                        stop = true;
                                        temp = i;
                                    }
                                }
                                if(!stop)
                                {
                                    temp = pageLeaf.keys.length;
                                }
                                pageLeaf = pageLeaf.children[temp];
                            }
                            if(pageLeaf.n<this.t)
                            {
                                this.insertInOrder(page,pageLeaf.keys);
                                pageLeaf.n++;
                            }
                            else{
                                this.insertInOrder(page,pageLeaf.keys);
                                pageLeaf.n++;
                                do
                                {
                                    tempNode = this.split(pageLeaf);
                                    pageLeaf = tempNode;
                                }
                                while(pageLeaf.n>pageLeaf.t);
                            }
                            pushSwareTopVisualStep(
                                insertTrace,
                                topTreeBefore,
                                cloneSwareTreeState(this),
                                i,
                                j,
                                page
                            );
                        }
                    }
                }
            }
            else{
                if(this.root.keys.length==0)
                {
                    //can create non-leaf root node
                    if(this.lastSortedIndex>0)
                    {
                        let newRoot = new Node(this.internalSize, false);
                        let firstLeaf = new Node(this.t, true);
                        let secondLeaf = new Node(this.t ,true);
                        this.buffer[0].sort((a,b)=>a-b);
                        this.buffer[1].sort((a,b)=>a-b);
                        newRoot.children = [firstLeaf, secondLeaf];
                        newRoot.keys = [this.buffer[1][0]];
                        newRoot.n=1;
                        firstLeaf.keys = [...this.buffer[0]];
                        secondLeaf.keys = [...this.buffer[1]];
                        firstLeaf.next = secondLeaf;
                        firstLeaf.parent = newRoot;
                        secondLeaf.parent = newRoot;
                        firstLeaf.n = this.t;
                        secondLeaf.n = this.t;
                        this.tail = secondLeaf;
                        this.leafs=2;
                        //this.size = 2*this.t;
                        this.root = newRoot;
                        this.fastInserted = true;
                        insertTrace.fastInsertOccurred = true;
                        insertTrace.flushEvents.push({
                            type: "fast",
                            pageIndex: 0,
                            page: this.buffer[0][0]
                        });
                        insertTrace.flushEvents.push({
                            type: "fast",
                            pageIndex: 1,
                            page: this.buffer[1][0]
                        });
                        pushSwareFastVisualStep(
                            insertTrace,
                            buildSwareSingleLeafVisualState(this.t, this.buffer[0]),
                            0
                        );
                        pushSwareFastVisualStep(insertTrace, this, 1);
                        this.fastInserts+=20;
                        for(let i = 2;i<=this.lastSortedIndex&&i<=Math.floor((this.t/2)-1);i++)
                        {
                            //can fast insert everything because we will only 
                            // flush sorted part of buffer
                            insertTrace.fastInsertOccurred = true;
                            insertTrace.flushEvents.push({
                                type: "fast",
                                pageIndex: i,
                                page: this.buffer[i][0]
                            });
                            this.buffer[i].sort((a,b)=>a-b);
                            this.tail.parent.keys.push(this.buffer[i][0]);
                            newTail = new Node(this.t,true);
                            this.leafs++;
                            //this.size+=this.t;
                            newTail.n=this.t;
                            newTail.keys = [...this.buffer[i]];
                            this.tail.next = newTail;
                            newTail.parent = this.tail.parent;
                            this.tail.parent.children.push(newTail);
                            this.tail.parent.n++;
                            tempNode = this.tail.parent;
                            while(tempNode.n>tempNode.t)
                                tempNode = this.split(tempNode);
                            this.tail = newTail;
                            this.fastInserts+=10;
                            this.fastInserted = true;
                            pushSwareFastVisualStep(insertTrace, this, i);
                        }
                    }
                    else
                    {
                        //can only fill up root node
                        this.buffer[0].sort((a,b)=>a-b);
                        this.root.keys = [...this.buffer[0]];
                        this.root.n = this.t;
                        //this.size = this.t;
                        insertTrace.fastInsertOccurred = true;
                        insertTrace.flushEvents.push({
                            type: "fast",
                            pageIndex: 0,
                            page: this.buffer[0][0]
                        });
                        pushSwareFastVisualStep(insertTrace, this, 0);
                        this.fastInserts+=10;
                        this.fastInserted = true;
                    }
                }
                else if(this.root.keys.length==this.t)
                {
                    this.buffer[0].sort((a,b)=>a-b);
                    //fast insert check
                    if(this.buffer[0][0]>this.root.keys[this.root.keys.length-1])
                    {
                        let newRoot = new Node(this.internalSize, false);
                        let firstLeaf = new Node(this.t, true);
                        let secondLeaf = new Node(this.t ,true);
                        newRoot.children = [firstLeaf, secondLeaf];
                        newRoot.keys = [this.buffer[0][0]];
                        newRoot.n=1;
                        firstLeaf.keys = this.root.keys;
                        secondLeaf.keys = [...this.buffer[0]];
                        firstLeaf.next = secondLeaf;
                        firstLeaf.parent = newRoot;
                        secondLeaf.parent = newRoot;
                        firstLeaf.n = this.t;
                        secondLeaf.n = this.t;
                        this.tail = secondLeaf;
                        this.leafs=2;
                        //this.size = 2*this.t;
                        this.root = newRoot;
                        insertTrace.fastInsertOccurred = true;
                        insertTrace.flushEvents.push({
                            type: "fast",
                            pageIndex: 0,
                            page: this.buffer[0][0]
                        });
                        pushSwareFastVisualStep(insertTrace, this, 0);
                        this.fastInserted = true;
                        this.fastInserts+=10;
                    }
                    else
                    {
                        //break page up and top insert
                        this.fastInserted = false;
                        for(let i = 0;i<this.buffer[0].length;i++)
                        {
                            this.topInserts++;
                            //this.size++;
                            page = this.buffer[0][i];
                            insertTrace.topInsertOccurred = true;
                            const topTreeBefore = cloneSwareTreeState(this);
                            insertTrace.flushEvents.push({
                                type: "top",
                                pageIndex: 0,
                                slotIndex: i,
                                page: page
                            });
                            pageLeaf = this.root;
                            while(!(pageLeaf.leaf))
                            {
                                stop = false;
                                for(let i = 0;i<pageLeaf.keys.length&&!stop;i++)
                                {
                                    if(page<pageLeaf.keys[i])
                                    {
                                        stop = true;
                                        temp = i;
                                    }
                                }
                                if(!stop)
                                {
                                    temp = pageLeaf.keys.length;
                                }
                                pageLeaf = pageLeaf.children[temp];
                            }
                            if(pageLeaf.n<this.t)
                            {
                                this.insertInOrder(page,pageLeaf.keys);
                                pageLeaf.n++;
                            }
                            else{
                                this.insertInOrder(page,pageLeaf.keys);
                                pageLeaf.n++;
                                do
                                {
                                    tempNode = this.split(pageLeaf);
                                    pageLeaf = tempNode;
                                }
                                while(pageLeaf.n>pageLeaf.t);
                            }
                            pushSwareTopVisualStep(
                                insertTrace,
                                topTreeBefore,
                                cloneSwareTreeState(this),
                                0,
                                i,
                                page
                            );
                        }
                    }
                    for(let i = 1;i<=this.lastSortedIndex&&i<=Math.floor((this.t/2)-1);i++)
                    {
                        //fast insert check
                        if(this.bufferDict[i][0]>=this.tail.keys[this.tail.n-1])
                        {
                            insertTrace.fastInsertOccurred = true;
                            insertTrace.flushEvents.push({
                                type: "fast",
                                pageIndex: i,
                                page: this.buffer[i][0]
                            });
                            this.buffer[i].sort((a,b)=>a-b);
                            this.tail.parent.keys.push(this.buffer[i][0]);
                            newTail = new Node(this.t,true);
                            this.leafs++;
                            //this.size+=this.t;
                            newTail.n=this.t;
                            newTail.keys = [...this.buffer[i]];
                            this.tail.next = newTail;
                            newTail.parent = this.tail.parent;
                            this.tail.parent.children.push(newTail);
                            this.tail.parent.n++;
                            tempNode = this.tail.parent;
                            while(tempNode.n>tempNode.t)
                                tempNode = this.split(tempNode);
                            this.tail = newTail;
                            this.fastInserts+=10;
                            this.fastInserted = true;
                            pushSwareFastVisualStep(insertTrace, this, i);
                        }
                        else
                        {
                            this.fastInserted = false;
                            //break page up and top insert
                            for(let j = 0;j<this.t;j++)
                            {
                                this.topInserts++;
                                //this.size++;
                                page = this.buffer[i][j];
                                insertTrace.topInsertOccurred = true;
                                const topTreeBefore = cloneSwareTreeState(this);
                                insertTrace.flushEvents.push({
                                    type: "top",
                                    pageIndex: i,
                                    slotIndex: j,
                                    page: page
                                });
                                pageLeaf = this.root;
                                while(!(pageLeaf.leaf))
                                {
                                    stop = false;
                                    for(let i = 0;i<pageLeaf.keys.length&&!stop;i++)
                                    {
                                        if(page<pageLeaf.keys[i])
                                        {
                                            stop = true;
                                            temp = i;
                                        }
                                    }
                                    if(!stop)
                                    {
                                        temp = pageLeaf.keys.length;
                                    }
                                    pageLeaf = pageLeaf.children[temp];
                                }
                                if(pageLeaf.n<pageLeaf.t)
                                {
                                    this.insertInOrder(page,pageLeaf.keys);
                                    pageLeaf.n++;
                                }
                                else{
                                    this.insertInOrder(page,pageLeaf.keys);
                                    pageLeaf.n++;
                                    do
                                    {
                                        tempNode = this.split(pageLeaf);
                                        pageLeaf = tempNode;
                                    }
                                    while(pageLeaf.n>pageLeaf.t);
                                }
                                pushSwareTopVisualStep(
                                    insertTrace,
                                    topTreeBefore,
                                    cloneSwareTreeState(this),
                                    i,
                                    j,
                                    page
                                );
                            }
                        }
                    }
                }
            }
            insertTrace.bufferSnapshotBeforeReset = this.buffer.map((row) => row.slice());
            insertTrace.lastSortedIndexBeforeReset = this.lastSortedIndex;
            this.bufferFlushes++;
            this.resetBuffer();
        }
        this.lastInsertInfo = insertTrace;
    }
    insertInOrder(page,array)
    {
        let temp;
        let stop = false;
        if(page<array[0])
        {
            stop = true;
            temp = 0;
        }
        for(let i = 0; i < array.length - 1 && !stop; i++)
        {
            if(page > array[i] && page < array[i+1])
            {
                stop = true;
                temp = i + 1;
            }
           
        }
        if(!stop)
        {
            temp = array.length;
        }
        array.splice(temp, 0, page);
        return temp;
    }
    load(page)
    {
        this.buffer[this.insertIndexX][this.insertIndexY]= page;
        this.insertIndexY++;
        if(this.insertIndexY==1)
        {
            this.bufferDict[this.insertIndexX] = [page, page];
        }
        else 
        {
            if(page>this.bufferDict[this.insertIndexX][1])
                this.bufferDict[this.insertIndexX][1] = page;
            else if(page<this.bufferDict[this.insertIndexX][0])
                this.bufferDict[this.insertIndexX][0] = page;
        }
        this.sort();
    }
    sort()
    {
        let min = this.bufferDict[this.insertIndexX][0];
        if(this.insertIndexX-1==this.lastSortedIndex)
        {
            if(min>=this.bufferDict[this.lastSortedIndex][1])
                this.lastSortedIndex++;
        }
        for(let i = this.lastSortedIndex;i>0;i--)
        {
            if(min<this.bufferDict[i][1]&&this.insertIndexX!=i)
            {
                this.lastSortedIndex = i-1;
            }
        }
        if(this.insertIndexY==this.t)
        {
            this.insertIndexX++;
            this.insertIndexY=0;
        }
        if(this.insertIndexX==this.t)
        {
            this.full = true;
        }
    }

    resetBuffer()
    {
        console.log(this.sortPages);
        let flushed = Math.min(this.lastSortedIndex,Math.floor((this.t/2)-1));
        this.totalPagesFlushed+=(flushed+1);
        this.avgPages = this.totalPagesFlushed/this.bufferFlushes;
        for(let i = 0;i<=flushed;i++)
        {
            this.buffer[i].length = 0;
            this.bufferDict[i].length = 0;
        }
        for(let i = flushed+1;i<this.t;i++)
        {
            this.sortPages++;
            for(let j = 0;j<this.t;j++)
            {
                this.tempArray.push(this.buffer[i][j]);
                this.tempArray.sort((a,b)=>a-b);
            }
        }
        for(let i = 0;this.tempArray.length>0&&i<this.t-flushed-1;i++)
        {
            for(let j = 0;j<this.t;j++)
            {
                this.buffer[i][j] = this.tempArray[0];
                this.tempArray.shift();
            }
            this.bufferDict[i] = [this.buffer[i][0],this.buffer[i][this.t-1]];
        }
        for(let i = this.t-(flushed)-1;i<this.t;i++)
        {
            this.buffer[i].length = 0;
            this.bufferDict[i].length = 0;
        }
        this.lastSortedIndex = this.t-(flushed)-2;
    }

    split(pageLeaf)
    {
        if(pageLeaf.leaf == true)
        {
            this.leafs++;
            if(pageLeaf.parent == null)
            {
                let newParent = new Node(this.internalSize,false);
                let splitNode = new Node(pageLeaf.t,true);
                let mid = Math.floor(pageLeaf.n/2);
                splitNode.n = pageLeaf.n - mid;
                pageLeaf.n = mid;
                const left = (pageLeaf.keys).slice(0,mid);
                const right = (pageLeaf.keys).slice(mid);
                pageLeaf.keys = left;
                splitNode.keys = right;
                splitNode.next = pageLeaf.next;
                pageLeaf.next = splitNode;
                //console.log(splitNode.keys[0]);
                newParent.keys[0] = splitNode.keys[0];
                newParent.children[0] = pageLeaf;
                newParent.children[1] = splitNode;
                newParent.n = 1;
                pageLeaf.parent = newParent;
                splitNode.parent = newParent;
                this.root = newParent;
                if(this.tail == pageLeaf)
                    this.tail = splitNode;
                return newParent;
            }
            else
            {
                //console.log("true");
                let splitNode = new Node(pageLeaf.t,true);
                let mid = Math.floor(pageLeaf.n/2);
                splitNode.n = pageLeaf.n - mid;
                pageLeaf.n = mid;
                const left = (pageLeaf.keys).slice(0,mid);
                const right = (pageLeaf.keys).slice(mid);
                pageLeaf.keys = left;
                splitNode.keys = right;
                splitNode.next = pageLeaf.next;
                pageLeaf.next = splitNode;
                splitNode.parent = pageLeaf.parent;
                let index = this.insertInOrder(splitNode.keys[0], pageLeaf.parent.keys);
                pageLeaf.parent.children.splice(index+1, 0, splitNode);
                pageLeaf.parent.n++;
                if(this.tail == pageLeaf)
                {
                    this.tail = splitNode;
                }
                return pageLeaf.parent;
            }
        }
        else
        {
            if(pageLeaf.parent == null)
            {
                let newParent = new Node(this.internalSize,false);
                let splitNode = new Node(this.internalSize,false);
                let mid = Math.floor(pageLeaf.n/2);
                splitNode.n = pageLeaf.n - mid-1;
                pageLeaf.n = mid;
                newParent.keys[0] = pageLeaf.keys[mid];
                const left = (pageLeaf.keys).slice(0,mid);
                const right = (pageLeaf.keys).slice(mid+1);
                pageLeaf.keys = left;
                splitNode.keys = right;
                splitNode.next = pageLeaf.next;
                pageLeaf.next = splitNode;
                //console.log(splitNode.keys[0]);
                const leftChild = (pageLeaf.children).slice(0,mid+1);
                const rightChild = (pageLeaf.children).slice(mid+1);
                pageLeaf.children = leftChild;
                splitNode.children = rightChild;
                for(let i = 0;i<rightChild.length;i++)
                {
                    rightChild[i].parent = splitNode;
                }
                newParent.children[0] = pageLeaf;
                newParent.children[1] = splitNode;
                newParent.n = 1;
                pageLeaf.parent = newParent;
                splitNode.parent = newParent;
                this.root = newParent;
                return newParent;
            }
            else
            {
                
                let splitNode = new Node(this.internalSize,false);
                let mid = Math.floor(pageLeaf.n/2);
                splitNode.n = pageLeaf.n - mid-1;
                pageLeaf.n = mid;
                const middle = pageLeaf.keys[mid];
                const left = (pageLeaf.keys).slice(0,mid);
                const right = (pageLeaf.keys).slice(mid+1);
                pageLeaf.keys = left;
                splitNode.keys = right;
                splitNode.next = pageLeaf.next;
                pageLeaf.next = splitNode;
                const leftChild = (pageLeaf.children).slice(0,mid+1);
                const rightChild = (pageLeaf.children).slice(mid+1);
                splitNode.parent = pageLeaf.parent;
                pageLeaf.children = leftChild;
                splitNode.children = rightChild;
                for(let i = 0;i<rightChild.length;i++)
                {
                    rightChild[i].parent = splitNode;
                }
                let index = this.insertInOrder(middle, pageLeaf.parent.keys);
                pageLeaf.parent.children.splice(index+1, 0, splitNode);
                pageLeaf.parent.n++;
                return pageLeaf.parent;
            }
        }
    }   
}
