/* 
 * One step of the QuIT algorithm
 */

const QUIT_DEFAULT_ORDER = 5;
const QUIT_MAX_INSERTION_SLOTS = 15;
const quitVisualRows = [];
let quitInsertionPanelTimer = null;
let quitPendingInsertValue = null;

function quit() {
    if (quitPendingInsertValue != null) {
        commitPendingQuitInsert();
    }

    if (total_data.length === 0) {
        running = false;
        return;
    }

    // Highlight the current head of the insertion stream.
    updateQuitInsertionsPanel(true);

    // Show the route on the current tree before applying the insertion.
    const page = total_data[0];
    const preInsertPath = findQuitPath(page);
    const willFastInsert = isQuitFastInsertCandidate(page);
    const topInsertPath = willFastInsert ? [] : preInsertPath;
    const fastInsertPath = (willFastInsert && quitTree.currPole) ? [quitTree.currPole] : [];
    renderQuitTree(topInsertPath, fastInsertPath);

    if (quitInsertionPanelTimer != null) {
        clearTimeout(quitInsertionPanelTimer);
        quitInsertionPanelTimer = null;
    }
    quitPendingInsertValue = page;

    const commitDelay = Math.max(0, Math.floor(delay * 0.2));
    if (commitDelay === 0) {
        commitPendingQuitInsert();
    }
    else {
        quitInsertionPanelTimer = setTimeout(() => {
            quitInsertionPanelTimer = null;
            commitPendingQuitInsert();
        }, commitDelay);
    }
}

function isQuitFastInsertCandidate(page)
{
    if (!quitTree || !quitTree.root) {
        return false;
    }
    if (quitTree.root.leaf) {
        return true;
    }

    const pole = quitTree.currPole;
    if (!pole) {
        return false;
    }

    const poleKeys = getQuitNodeKeys(pole);
    if (poleKeys.length === 0) {
        return false;
    }
    const poleMin = poleKeys[0];

    const nextPole = pole.next;
    const nextKeys = getQuitNodeKeys(nextPole);
    const nextMin = nextKeys.length > 0 ? nextKeys[0] : null;
    return page >= poleMin && (nextMin == null || page < nextMin);
}

function commitPendingQuitInsert()
{
    if (quitPendingInsertValue == null) {
        return;
    }

    const page = quitPendingInsertValue;
    quitPendingInsertValue = null;

    quitTree.insert(page);
    total_data.shift();
    renderQuitTree([], []);
    updateQuitInsertionsPanel(false);

    if (total_data.length === 0) {
        running = false;
    }

    quit_top_inserts_history.push(quitTree.size-quitTree.fastInserts);
    quit_fast_inserts_history.push(quitTree.fastInserts);
    quit_pole_resets_history.push(quitTree.poleResets);
}

function initializeQuitVisualization()
{
    if (quitInsertionPanelTimer != null) {
        clearTimeout(quitInsertionPanelTimer);
        quitInsertionPanelTimer = null;
    }
    quitPendingInsertValue = null;
    updateQuitInsertionsPanel(false);
    renderQuitTree([], []);
}

function getQuitNodeKeys(node)
{
    if (!node || !Array.isArray(node.keys)) {
        return [];
    }

    let keyCount = node.keys.length;
    if (typeof node.n === "number") {
        keyCount = Math.min(node.n, node.keys.length);
    }
    return node.keys.slice(0, keyCount);
}

function getQuitNodeChildren(node)
{
    if (!node || !Array.isArray(node.children)) {
        return [];
    }
    return node.children.filter((child) => child != null);
}

function collectQuitLevels()
{
    if (!quitTree || !quitTree.root) {
        return [];
    }

    const levels = [];
    let current = [quitTree.root];

    while (current.length > 0) {
        levels.push(current);
        const next = [];
        for (const node of current) {
            if (!node || node.leaf) {
                continue;
            }
            const children = getQuitNodeChildren(node);
            for (const child of children) {
                next.push(child);
            }
        }
        current = next;
    }

    return levels;
}

function computeQuitRanges(node, rangeMap)
{
    if (!node) {
        return [null, null];
    }

    const keys = getQuitNodeKeys(node);
    if (node.leaf) {
        let minKey = null;
        let maxKey = null;
        if (keys.length > 0) {
            minKey = keys[0];
            maxKey = keys[keys.length - 1];
        }
        const range = [minKey, maxKey];
        rangeMap.set(node, range);
        return range;
    }

    const children = getQuitNodeChildren(node);
    let minChild = null;
    let maxChild = null;
    for (const child of children) {
        const childRange = computeQuitRanges(child, rangeMap);
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

function formatQuitRange(range)
{
    if (!range || range[0] == null || range[1] == null) {
        return "[-, -]";
    }
    return "[" + range[0] + ", " + range[1] + "]";
}

function getQuitNodeCapacity(node)
{
    if (!node) {
        return 1;
    }

    const fallbackCapacity = (typeof node.t === "number" && node.t > 0)
        ? node.t
        : Math.max(getQuitNodeKeys(node).length, 1);
    if (!quitTree) {
        return fallbackCapacity;
    }

    const treeCapacity = node.leaf ? quitTree.t : quitTree.internalSize;
    if (typeof treeCapacity !== "number" || treeCapacity < 1) {
        return fallbackCapacity;
    }

    return Math.max(1, treeCapacity);
}

function getQuitKeyColumnCount(slotCount)
{
    if (!Number.isFinite(slotCount) || slotCount < 1) {
        return 1;
    }
    return Math.min(slotCount, 6);
}

function createQuitNodeCard(node, depth, range, isPathNode, isFastNode, hasLeafNextPointer, isPoleNode)
{
    const keys = getQuitNodeKeys(node);
    const nodeCapacity = getQuitNodeCapacity(node);
    const slotCount = Math.max(nodeCapacity, keys.length, 1);
    const keyColumns = getQuitKeyColumnCount(slotCount);
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
    if (isFastNode) {
        card.classList.add("quit-fast-active");
    }
    if (isPoleNode) {
        card.classList.add("quit-pole-node");
    }

    const header = document.createElement("div");
    header.className = "quit-node-header";
    let headerLabel;
    if (depth === 0) {
        headerLabel = "Root";
    }
    else {
        headerLabel = node.leaf ? "Leaf" : "Internal";
    }
    if (isPoleNode) {
        headerLabel += " (pole)";
    }
    header.textContent = headerLabel;

    const rangeLabel = document.createElement("div");
    rangeLabel.className = "quit-node-range";
    rangeLabel.textContent = "Range " + formatQuitRange(range);

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
            keyCell.textContent = ".";
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
        leafPointer.textContent = "next ->";
        card.appendChild(leafPointer);
    }

    return card;
}

function createQuitEllipsisCard(isPathNode)
{
    const card = document.createElement("div");
    card.className = "quit-node-ellipsis";
    if (isPathNode) {
        card.classList.add("quit-ellipsis-path-active");
    }
    card.textContent = "...";
    return card;
}

function createQuitLayerEllipsisCard(isPathNode, hiddenLayerCount)
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

function getPathFromRoot(node)
{
    if (!node) {
        return [];
    }

    const reversePath = [];
    let cursor = node;
    while (cursor) {
        reversePath.push(cursor);
        cursor = cursor.parent;
    }
    return reversePath.reverse();
}

function compressQuitLevel(nodes, focusNode, preferMiddleNode)
{
    if (!nodes || nodes.length <= 5) {
        return nodes.map((node) => ({ type: "node", node: node }));
    }

    let focusIndex;
    if (preferMiddleNode) {
        focusIndex = Math.floor((nodes.length - 1) / 2);
    }
    else {
        focusIndex = nodes.indexOf(focusNode);
        if (focusIndex === -1) {
            focusIndex = Math.floor((nodes.length - 1) / 2);
        }
    }

    const keepSet = new Set([0, focusIndex, nodes.length - 1]);
    const keepIndexes = Array.from(keepSet).sort((a, b) => a - b);
    const compressed = [];

    for (let i = 0; i < keepIndexes.length; i++) {
        if (i > 0 && keepIndexes[i] - keepIndexes[i - 1] > 1) {
            compressed.push({
                type: "ellipsis",
                startIndex: keepIndexes[i - 1] + 1,
                endIndex: keepIndexes[i] - 1
            });
        }
        compressed.push({ type: "node", node: nodes[keepIndexes[i]] });
    }

    return compressed;
}

function isQuitEllipsisOnPath(item, levelNodes, pathSet)
{
    if (!item || item.type !== "ellipsis") {
        return false;
    }
    if (!levelNodes || !pathSet || pathSet.size === 0) {
        return false;
    }

    const start = item.startIndex;
    const end = item.endIndex;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
        return false;
    }

    for (let i = start; i <= end && i < levelNodes.length; i++) {
        if (pathSet.has(levelNodes[i])) {
            return true;
        }
    }
    return false;
}

function getQuitVisibleLevelIndexes(levelCount)
{
    if (levelCount <= 4) {
        return Array.from({ length: levelCount }, (_, index) => index);
    }

    return [0, 1, levelCount - 1];
}

function isQuitLayerEllipsisOnPath(startLevel, endLevel, levels, pathSet)
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

function getQuitDisplayRows(levels, insertionPath, pathSet)
{
    const displayRows = [];
    if (!levels || levels.length === 0) {
        return displayRows;
    }

    const poleLeaf = quitTree.currPole && quitTree.currPole.leaf
        ? quitTree.currPole
        : (insertionPath.length > 0 ? insertionPath[insertionPath.length - 1] : null);
    const polePath = getPathFromRoot(poleLeaf);
    const visibleLevels = getQuitVisibleLevelIndexes(levels.length);

    for (let i = 0; i < visibleLevels.length; i++) {
        const level = visibleLevels[i];
        const nodes = levels[level];
        const isLeafLevel = nodes.length > 0 && nodes[0].leaf;
        const focusNode = isLeafLevel ? (polePath[level] || insertionPath[level] || null) : null;
        displayRows.push({
            type: "level",
            levelIndex: level,
            items: compressQuitLevel(nodes, focusNode, !isLeafLevel)
        });

        if (i < visibleLevels.length - 1) {
            const nextLevel = visibleLevels[i + 1];
            if (nextLevel - level > 1) {
                displayRows.push({
                    type: "layer-ellipsis",
                    startLevel: level + 1,
                    endLevel: nextLevel - 1,
                    isPathNode: isQuitLayerEllipsisOnPath(level + 1, nextLevel - 1, levels, pathSet)
                });
            }
        }
    }

    return displayRows;
}

function renderQuitTree(pathNodes, fastNodes)
{
    const quitGrid = document.getElementById("quit-tree-grid");
    if (!quitGrid) {
        return;
    }

    const levels = collectQuitLevels();
    const pathSet = new Set(pathNodes || []);
    const fastSet = new Set(fastNodes || []);
    const displayRows = getQuitDisplayRows(levels, pathNodes || [], pathSet);
    const nodeSlotMap = new Map();

    const rangeMap = new Map();
    if (quitTree && quitTree.root) {
        computeQuitRanges(quitTree.root, rangeMap);
    }

    while (quitVisualRows.length < displayRows.length) {
        const row = document.createElement("div");
        row.className = "quit-tree-row";
        quitGrid.appendChild(row);
        quitVisualRows.push({ row: row, slots: [] });
    }

    for (let rowIndex = 0; rowIndex < displayRows.length; rowIndex++) {
        const rowData = quitVisualRows[rowIndex];
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

            for (let i = 0; i < rowData.slots.length; i++) {
                const slot = rowData.slots[i];
                if (i > 0) {
                    slot.classList.add("hidden");
                    slot.innerHTML = "";
                    continue;
                }
                slot.classList.remove("hidden");
                slot.innerHTML = "";
                const hiddenLayerCount = (rowInfo.endLevel - rowInfo.startLevel) + 1;
                slot.appendChild(createQuitLayerEllipsisCard(rowInfo.isPathNode, hiddenLayerCount));
            }
            continue;
        }

        const levelIndex = rowInfo.levelIndex;
        const displayItems = rowInfo.items;
        const nodes = levels[levelIndex];
        const isLeafLevel = nodes.length > 0 && nodes[0].leaf;
        row.style.setProperty("--quit-cols", Math.max(displayItems.length, 1));

        while (rowData.slots.length < displayItems.length) {
            const slot = document.createElement("div");
            slot.className = "quit-node-slot hidden";
            row.appendChild(slot);
            rowData.slots.push(slot);
        }

        for (let i = 0; i < rowData.slots.length; i++) {
            const slot = rowData.slots[i];
            if (i >= displayItems.length) {
                slot.classList.add("hidden");
                slot.innerHTML = "";
                continue;
            }

            const item = displayItems[i];
            slot.classList.remove("hidden");
            slot.innerHTML = "";
            if (item.type === "ellipsis") {
                const ellipsisOnPath = isQuitEllipsisOnPath(item, nodes, pathSet);
                slot.appendChild(createQuitEllipsisCard(ellipsisOnPath));
                continue;
            }

            const node = item.node;
            const card = createQuitNodeCard(
                node,
                levelIndex,
                rangeMap.get(node),
                pathSet.has(node),
                fastSet.has(node),
                isLeafLevel && hasVisibleNextLeaf(displayItems, i),
                node === quitTree.currPole
            );
            slot.appendChild(card);
            nodeSlotMap.set(node, slot);
        }
    }

    for (let rowIndex = displayRows.length; rowIndex < quitVisualRows.length; rowIndex++) {
        const rowData = quitVisualRows[rowIndex];
        rowData.row.classList.add("hidden");
        rowData.row.classList.remove("quit-row-layer-ellipsis");
        for (const slot of rowData.slots) {
            slot.classList.add("hidden");
            slot.innerHTML = "";
        }
    }

    requestAnimationFrame(() => {
        drawQuitConnections(levels, nodeSlotMap);
    });
}

function hasVisibleNextLeaf(displayItems, currentIndex)
{
    for (let i = currentIndex + 1; i < displayItems.length; i++) {
        if (displayItems[i].type === "node") {
            return true;
        }
    }
    return false;
}

function drawQuitConnections(levels, nodeSlotMap)
{
    const quitGrid = document.getElementById("quit-tree-grid");
    const linkLayer = document.getElementById("quit-tree-links");
    if (!quitGrid || !linkLayer) {
        return;
    }

    const gridRect = quitGrid.getBoundingClientRect();
    const layerWidth = Math.max(quitGrid.scrollWidth, quitGrid.clientWidth);
    const layerHeight = Math.max(quitGrid.scrollHeight, quitGrid.clientHeight);
    linkLayer.setAttribute("width", layerWidth.toString());
    linkLayer.setAttribute("height", layerHeight.toString());
    linkLayer.setAttribute("viewBox", "0 0 " + layerWidth + " " + layerHeight);
    linkLayer.innerHTML = "";

    if (!levels || levels.length <= 1) {
        return;
    }

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
            const children = getQuitNodeChildren(parent);

            for (const child of children) {
                const childSlot = nodeSlotMap.get(child);
                if (!childSlot) {
                    continue;
                }

                const childRect = childSlot.getBoundingClientRect();
                const childX = (childRect.left - gridRect.left) + (childRect.width / 2);
                const childY = (childRect.top - gridRect.top);

                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute(
                    "d",
                    "M " + parentX + " " + parentY +
                    " L " + childX + " " + childY
                );
                path.setAttribute("class", "quit-tree-link-path");
                linkLayer.appendChild(path);
            }
        }
    }
}

function findQuitPath(page)
{
    const path = [];
    let node = quitTree.root;
    while (node) {
        path.push(node);
        if (node.leaf) {
            break;
        }

        const keys = getQuitNodeKeys(node);
        let childIndex = 0;
        while (childIndex < keys.length && page >= keys[childIndex]) {
            childIndex++;
        }
        node = node.children[childIndex] || null;
    }
    return path;
}

function clearQuitInsertionsPanel()
{
    const slotCount = syncQuitInsertionPanelCapacity();
    for (let i = 0; i < slotCount; i++) {
        const pageSlot = document.getElementById("page" + i);
        if (!pageSlot) {
            continue;
        }
        pageSlot.innerHTML = "";
        pageSlot.classList.remove("glow-green");
        pageSlot.classList.remove("glow-red");
    }
    return slotCount;
}

function updateQuitInsertionsPanel(highlightFirst)
{
    const slotCount = clearQuitInsertionsPanel();
    for (let i = 0; i < total_data.length && i < slotCount; i++) {
        const pageSlot = document.getElementById("page" + i);
        if (!pageSlot) {
            continue;
        }
        pageSlot.innerHTML = total_data[i];
    }

    if (highlightFirst) {
        const firstSlot = document.getElementById("page0");
        if (firstSlot && firstSlot.innerHTML !== "") {
            firstSlot.classList.add("glow-green");
        }
    }
}

function getQuitPoleCapacity()
{
    return QUIT_MAX_INSERTION_SLOTS;
}

function syncQuitInsertionPanelCapacity()
{
    const capacity = getQuitPoleCapacity();
    for (let i = 0; i < QUIT_MAX_INSERTION_SLOTS; i++) {
        const pageSlot = document.getElementById("page" + i);
        if (!pageSlot) {
            continue;
        }

        if (i < capacity) {
            pageSlot.classList.remove("hidden");
        }
        else {
            pageSlot.classList.add("hidden");
            pageSlot.innerHTML = "";
            pageSlot.classList.remove("glow-green");
            pageSlot.classList.remove("glow-red");
        }
    }
    return capacity;
}

const auxiliaryStructureVisualRows = {};

function getAuxiliaryStructureRows(gridId)
{
    if (!auxiliaryStructureVisualRows[gridId]) {
        auxiliaryStructureVisualRows[gridId] = [];
    }
    return auxiliaryStructureVisualRows[gridId];
}

function getAuxiliaryNodeKeys(node)
{
    if (!node || !Array.isArray(node.keys)) {
        return [];
    }

    let keyCount = node.keys.length;
    if (typeof node.n === "number") {
        keyCount = Math.min(node.n, node.keys.length);
    }
    return node.keys.slice(0, keyCount);
}

function getAuxiliaryNodeChildren(node)
{
    if (!node || !Array.isArray(node.children)) {
        return [];
    }
    return node.children.filter((child) => child != null);
}

function collectAuxiliaryLevels(tree)
{
    if (!tree || !tree.root) {
        return [];
    }

    const levels = [];
    let current = [tree.root];
    while (current.length > 0) {
        levels.push(current);
        const next = [];
        for (const node of current) {
            if (!node || node.leaf) {
                continue;
            }
            const children = getAuxiliaryNodeChildren(node);
            for (const child of children) {
                next.push(child);
            }
        }
        current = next;
    }
    return levels;
}

function computeAuxiliaryRanges(node, rangeMap)
{
    if (!node) {
        return [null, null];
    }

    const keys = getAuxiliaryNodeKeys(node);
    if (node.leaf) {
        const range = keys.length > 0
            ? [keys[0], keys[keys.length - 1]]
            : [null, null];
        rangeMap.set(node, range);
        return range;
    }

    const children = getAuxiliaryNodeChildren(node);
    let minChild = null;
    let maxChild = null;
    for (const child of children) {
        const childRange = computeAuxiliaryRanges(child, rangeMap);
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

function getAuxiliaryNodeCapacity(tree, node)
{
    if (!node) {
        return 1;
    }

    const fallbackCapacity = (typeof node.t === "number" && node.t > 0)
        ? node.t
        : Math.max(getAuxiliaryNodeKeys(node).length, 1);
    if (!tree) {
        return fallbackCapacity;
    }

    const internalCapacity = (typeof tree.internalSize === "number" && tree.internalSize > 0)
        ? tree.internalSize
        : (typeof tree.t === "number" && tree.t > 0 ? calculate_internal(tree.t) : fallbackCapacity);
    const treeCapacity = node.leaf ? tree.t : internalCapacity;
    if (!Number.isFinite(treeCapacity) || treeCapacity < 1) {
        return fallbackCapacity;
    }

    return Math.max(1, treeCapacity);
}

function createAuxiliaryNodeCard(node, depth, range, isPathNode, isFastNode, hasLeafNextPointer, isFocusNode, focusLabel, tree)
{
    const keys = getAuxiliaryNodeKeys(node);
    const nodeCapacity = getAuxiliaryNodeCapacity(tree, node);
    const slotCount = Math.max(nodeCapacity, keys.length, 1);
    const keyColumns = getQuitKeyColumnCount(slotCount);
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
    if (isFastNode) {
        card.classList.add("quit-fast-active");
    }
    if (isFocusNode) {
        card.classList.add("quit-pole-node");
    }

    const header = document.createElement("div");
    header.className = "quit-node-header";
    let headerLabel;
    if (depth === 0) {
        headerLabel = "Root";
    }
    else {
        headerLabel = node.leaf ? "Leaf" : "Internal";
    }
    if (isFocusNode) {
        headerLabel += " (" + focusLabel + ")";
    }
    header.textContent = headerLabel;

    const rangeLabel = document.createElement("div");
    rangeLabel.className = "quit-node-range";
    rangeLabel.textContent = "Range " + formatQuitRange(range);

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
            keyCell.textContent = ".";
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
        leafPointer.textContent = "next ->";
        card.appendChild(leafPointer);
    }

    return card;
}

function getAuxiliaryDisplayRows(tree, levels, insertionPath, pathSet, focusLeaf)
{
    const displayRows = [];
    if (!levels || levels.length === 0) {
        return displayRows;
    }

    const focusPath = getPathFromRoot(focusLeaf || (insertionPath.length > 0 ? insertionPath[insertionPath.length - 1] : null));
    const visibleLevels = getQuitVisibleLevelIndexes(levels.length);

    for (let i = 0; i < visibleLevels.length; i++) {
        const level = visibleLevels[i];
        const nodes = levels[level];
        const isLeafLevel = nodes.length > 0 && nodes[0].leaf;
        const focusNode = isLeafLevel ? (focusPath[level] || insertionPath[level] || null) : null;
        displayRows.push({
            type: "level",
            levelIndex: level,
            items: compressQuitLevel(nodes, focusNode, !isLeafLevel)
        });

        if (i < visibleLevels.length - 1) {
            const nextLevel = visibleLevels[i + 1];
            if (nextLevel - level > 1) {
                displayRows.push({
                    type: "layer-ellipsis",
                    startLevel: level + 1,
                    endLevel: nextLevel - 1,
                    isPathNode: isQuitLayerEllipsisOnPath(level + 1, nextLevel - 1, levels, pathSet)
                });
            }
        }
    }

    return displayRows;
}

function hasVisibleNextLeafAuxiliary(displayItems, currentIndex)
{
    for (let i = currentIndex + 1; i < displayItems.length; i++) {
        if (displayItems[i].type === "node") {
            return true;
        }
    }
    return false;
}

function renderAuxiliaryTree(tree, gridId, linksId, focusNode, focusLabel, pathNodes, fastNodes)
{
    const grid = document.getElementById(gridId);
    if (!grid) {
        return;
    }

    const levels = collectAuxiliaryLevels(tree);
    const pathSet = new Set(pathNodes || []);
    const fastSet = new Set(fastNodes || []);
    const displayRows = getAuxiliaryDisplayRows(tree, levels, pathNodes || [], pathSet, focusNode);
    const nodeSlotMap = new Map();
    const visualRows = getAuxiliaryStructureRows(gridId);

    const rangeMap = new Map();
    if (tree && tree.root) {
        computeAuxiliaryRanges(tree.root, rangeMap);
    }

    while (visualRows.length < displayRows.length) {
        const row = document.createElement("div");
        row.className = "quit-tree-row";
        grid.appendChild(row);
        visualRows.push({ row: row, slots: [] });
    }

    for (let rowIndex = 0; rowIndex < displayRows.length; rowIndex++) {
        const rowData = visualRows[rowIndex];
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

            for (let i = 0; i < rowData.slots.length; i++) {
                const slot = rowData.slots[i];
                if (i > 0) {
                    slot.classList.add("hidden");
                    slot.innerHTML = "";
                    continue;
                }
                slot.classList.remove("hidden");
                slot.innerHTML = "";
                const hiddenLayerCount = (rowInfo.endLevel - rowInfo.startLevel) + 1;
                slot.appendChild(createQuitLayerEllipsisCard(rowInfo.isPathNode, hiddenLayerCount));
            }
            continue;
        }

        const levelIndex = rowInfo.levelIndex;
        const displayItems = rowInfo.items;
        const levelNodes = levels[levelIndex];
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
            if (item.type === "ellipsis") {
                slot.appendChild(createQuitEllipsisCard(isQuitEllipsisOnPath(item, levelNodes, pathSet)));
                continue;
            }

            const node = item.node;
            const card = createAuxiliaryNodeCard(
                node,
                levelIndex,
                rangeMap.get(node),
                pathSet.has(node),
                fastSet.has(node),
                isLeafLevel && hasVisibleNextLeafAuxiliary(displayItems, slotIndex),
                node === focusNode,
                focusLabel,
                tree
            );
            slot.appendChild(card);
            nodeSlotMap.set(node, slot);
        }
    }

    for (let rowIndex = displayRows.length; rowIndex < visualRows.length; rowIndex++) {
        const rowData = visualRows[rowIndex];
        rowData.row.classList.add("hidden");
        rowData.row.classList.remove("quit-row-layer-ellipsis");
        for (const slot of rowData.slots) {
            slot.classList.add("hidden");
            slot.innerHTML = "";
        }
    }

    requestAnimationFrame(() => {
        drawAuxiliaryConnections(levels, nodeSlotMap, gridId, linksId, pathNodes || []);
    });
}

function drawAuxiliaryConnections(levels, nodeSlotMap, gridId, linksId, pathNodes)
{
    const grid = document.getElementById(gridId);
    const linkLayer = document.getElementById(linksId);
    if (!grid || !linkLayer) {
        return;
    }

    const gridRect = grid.getBoundingClientRect();
    const layerWidth = Math.max(grid.scrollWidth, grid.clientWidth);
    const layerHeight = Math.max(grid.scrollHeight, grid.clientHeight);
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
            const children = getAuxiliaryNodeChildren(parent);

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

function findAuxiliaryPath(tree, page)
{
    const path = [];
    let node = tree && tree.root ? tree.root : null;
    while (node) {
        path.push(node);
        if (node.leaf) {
            break;
        }

        const keys = getAuxiliaryNodeKeys(node);
        let childIndex = 0;
        while (childIndex < keys.length && page >= keys[childIndex]) {
            childIndex++;
        }
        node = node.children[childIndex] || null;
    }
    return path;
}



//don't change anything below this
class QuIT {
    constructor(t) {
        this.t = t;
        this.root = new Node(t, true);
        this.firstLeaf = this.root;
        this.fastInserts = 0;
        this.fastInserted = true;
        this.fastPathResets = 0;
        // QuIT poles
        this.currPole = this.root;
        this.prevPole = this.root;
        this.nextPole = null;
        this.missesInRow = 0;
        this.size = 0;
        this.leafs = 1;
        this.internalSize = calculate_internal(t);
    }
    insert(page)
    {
        this.size++;
        let pageLeaf = this.root;
        let temp;
        let stop;
        let tempNode;
        if(!this.root.leaf)
        {
            //check if we can fast insert
            if(page>=this.currPole.keys[0]&&(this.currPole.next==null||page<this.currPole.next.keys[0]))
            {
                pageLeaf = this.currPole;
                this.fastInserts++;
                this.fastInserted = true;
                this.missesInRow = 0;
            }
            else//top insert
            {
                this.fastInserted = false;
                this.missesInRow++;
                //find currect leaf
                while(!(pageLeaf.leaf))
                {
                    stop = false
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
            }
           
        }
        else
        {
            this.fastInserts++;
            this.fastInserted = true;
        }
        if(this.missesInRow ==(Math.floor(Math.sqrt(this.t))+1))
        {
            this.fastPathResets++;
            //console.log("pole reset");
            let first;
            first = this.root;
            while(!first.leaf)
            {
               
                first = first.children[0];
            }
            while(!first.next == pageLeaf)
            {
                first = first.next;
            }
            this.prevPole = first;
            this.currPole = pageLeaf;
            this.nextPole = pageLeaf.next;
            this.missesInRow = 0;
        }
        if(pageLeaf.n<pageLeaf.t)
        {
            if(pageLeaf == this.nextPole)
            {
                this.prevPole = this.currPole;
                this.currPole = this.nextPole;
                this.nextPole = null;
            }
            this.insertInOrder(page,pageLeaf.keys);
            pageLeaf.n++;
        }
        else{
            this.insertInOrder(page,pageLeaf.keys);
            pageLeaf.n++;
            //pole catchup
            if(pageLeaf == this.nextPole)
            {
                this.prevPole = this.currPole;
                this.currPole = this.nextPole;
                this.nextPole = null;
            }
           
            do
            {
                tempNode = this.split(pageLeaf);
                pageLeaf = tempNode;
            }
            while(pageLeaf.n>pageLeaf.t);
        }
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
    split(pageLeaf)
    {
        if(pageLeaf.leaf == true)
        {
            this.leafs++;
            //tree consists of 1 node
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
                this.currPole = splitNode;
                this.prevPole = pageLeaf;
                this.firstLeaf = pageLeaf;
                return newParent;
            }
            else
            {
                //console.log("true");
                let splitNode = new Node(pageLeaf.t,true);
                let mid = Math.floor(pageLeaf.n/2);
                let r,p,q,poleSize,prevPoleSize,x;
                let poleNode = false;
                let updatePrev = false;
                if(pageLeaf == this.prevPole)
                    updatePrev = true;
                if(pageLeaf == this.currPole)
                    poleNode = true;
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
                if(poleNode)
                {
                    this.nextPole = splitNode;
                    r = this.nextPole.keys[0];
                    p = this.prevPole.keys[0];
                    q = this.currPole.keys[0];
                    poleSize = this.currPole.n;
                    prevPoleSize = this.prevPole.n;
                    x = q+(((q-p)/prevPoleSize)*poleSize*1.5);
                    if(r<=x)
                    {
                        //this.poleResets++;
                        this.prevPole = this.currPole;
                        this.currPole = this.nextPole;
                        this.nextPole = null;
                    }
                }
                else if(updatePrev)
                    this.prevPole = splitNode;//keeps prevPole as node directly to the left of pole
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
