/* 
 * One step of the QuIT algorithm
 */

function quit() {
    // Get the page from the data stream
    let page;
    let removedPageIndex = 0; // the page flushed from buffer is always page0
    console.log(pole_next);
    // If we are at the start state fill the data stream too
    if (total_data.length == selectedN) {
        page = total_data[0];
        total_data.shift();
        /*
        for (let i = 0; i < 15; i++) {
            const p = document.getElementById("page" + i);
            p.innerHTML = total_data[i];
            //total_data.shift();
        }
            */
    }
    // Not the start state
    else {
        // Fill up the data stream, shift everything left
        /*
        page = document.getElementById("page0").innerHTML;
        let page_i;
        for (page_i = 0; page_i < 14; page_i++) {
            // Shift all pages to the left
            const p = document.getElementById("page" + page_i);
            const page_next = document.getElementById("page" + (page_i + 1));
            p.innerHTML = page_next.innerHTML;
        }
        // Fill the last page in the data stream
        const last_p = document.getElementById("page" + page_i); 
        // If we are at the end of the data stream, stop the algorithm
        */
        if (total_data.length == 0) {
            running = false;
        }
        else {
            //last_p.innerHTML = total_data[0];
            page = total_data[0];
            total_data.shift();
        }
    }

    page = parseInt(page); // convert page to integer
    // Initial phase - building first pole while we have less than leaf_node_size
    if (inserted_data_quit.length < leaf_node_size - 1) {        
        inserted_data_quit.push(page);
        pole.push(page);
        pole.sort((a, b) => a - b);
        quit_fast_inserts++;

        //Visualize fast insert
        const { side, level } = getTargetLevelForPage(page);
        traceTreePath(side, "fast", level);
        if(page>quit_max)
            quit_max = page;
        //animateQuitPage(removedPageIndex, 'normal');
        quit_fast_inserts_history.push(quit_fast_inserts);
        quit_top_inserts_history.push(quit_top_inserts);
        return;
    }

    // Create pole_prev when we first reach leaf_node_size
    if (inserted_data_quit.length == leaf_node_size-1) {
        inserted_data_quit.push(page);
        pole.push(page);
        pole.sort((a, b) => a - b);
        quit_fast_inserts++;
        zones_quit.push(pole);

        // Get a copy of the pole
        let pole_copy = [...pole];
        // Empty the pole
        pole = [];

        // Split at 50% (predefined)
        let mid = Math.floor(leaf_node_size / 2);

        // Split the pole into pole_prev and pole, first half goes to pole_prev
        for (let i = 0; i < mid; i++) {
            pole_prev.push(pole_copy[i]);
        }
        // Next half goes to pole
        for (let i = mid; i < leaf_node_size; i++) {
            pole.push(pole_copy[i]);
        }
        poleIndex = 1;
        // Pole changes, do animations
        let random_x = Math.floor(Math.random() * 81) + 10;
        document.getElementById("pole").style.left = random_x + "%";
        quit_pole_resets++;
        if(page>quit_max)
            quit_max = page;
        //animateQuitPage(removedPageIndex, 'bulk-load');
        quit_top_inserts_history.push(quit_top_inserts);
        quit_fast_inserts_history.push(quit_fast_inserts);
        return;
    }

    // Get minimum pages for prediction
    let q = Math.min(...pole);
    let p = Math.min(...pole_prev);
    // Check if page belongs to current pole's range
    if ((page >= q && page <= Math.max(...pole))||(pole[pole.length-1]==quit_max&&page>quit_max)) {
        console.log("page belongs to current pole range");
        if(page>quit_max)
            quit_max = page;

        pole.push(page);
        pole.sort((a, b) => a - b);
        // Handle pole splitting if needed (leaf node size is reached)
        if (pole.length == leaf_node_size) {
            console.log("Pole is full - Initiating split");

            let pole_copy = [...pole];
            pole = [];
            pole_next = [];

            // Split
            let mid = Math.floor(leaf_node_size / 2);
            for (let i = 0; i < mid; i++) {
                pole.push(pole_copy[i]);
            }
            for (let i = mid; i < leaf_node_size; i++) {
                pole_next.push(pole_copy[i]);
            }

            // Calculate catching up condition
            let e = Math.min(...pole_next);
            let x = q + ((q-p) / pole_prev.length) * pole.length * 1.5;

            console.log("Catching up check:");
            console.log("e: ", e);
            console.log("x ", x);
            // Check if pole_next is catching up (if it is, move pole forward)
            if (e <= x) {
                console.log("Catching up - Moving pole forward");
                pole_prev = pole;
                pole = pole_next;
                pole_next = [];
                quit_pole_resets++;
                poleIndex++;
                // Pole changes, do animations
                let random_x = Math.floor(Math.random() * 81) + 10;
                document.getElementById("pole").style.left = random_x + "%";
                quit_pole_resets++;
                quit_fast_inserts++;
                //animateQuitPage(removedPageIndex, 'bulk-load');
                quit_top_inserts_history.push(quit_top_inserts);
                quit_fast_inserts_history.push(quit_fast_inserts);
                return;
            } 
            // If pole_next is not catching up, do nothing
            else {
                console.log("Not catching up - Maintaining pole_prev, pole, and pole_next");
                //animateQuitPage(removedPageIndex, 'normal');
                quit_top_inserts_history.push(quit_top_inserts);
                quit_fast_inserts_history.push(quit_fast_inserts);
                return;
            }
        }

        // Fast insert into current pole
        inserted_data_quit.push(page);
        //pole.push(page);
        //pole.sort((a, b) => a - b);
        quit_fast_inserts++;

        console.log("Fast insert complete. New pole:", pole);

        // Visualize fast insert
        const { side, level } = getTargetLevelForPage(page);
        traceTreePath(side, "fast", level);

        //animateQuitPage(removedPageIndex, 'normal');

    } 
    // Page is outside pole range
    else {
        console.log("page is outside pole range - Handling outlier");

        // Simulate top_insert by checking if page belongs in pole_next
        let leaf_for_outlier = null;
        if (pole_next.length > 0 && page >= Math.min(...pole_next) && page <= Math.max(...pole_next)) {
            leaf_for_outlier = 'pole_next';
        }

        inserted_data_quit.push(page);

        // Update pole structure if outlier belongs in pole_next
        if (leaf_for_outlier === 'pole_next') {
            console.log("Outlier belongs in pole_next - Catching up");
            console.log("Making pole_next the new pole");
            pole_next.push(page);
            pole_next.sort((a, b) => a - b);
            pole_prev = pole;
            pole = pole_next;
            pole_next = [];
            quit_pole_resets++;

            // Pole changes, do animations
            let random_x = Math.floor(Math.random() * 81) + 10;
            document.getElementById("pole").style.left = random_x + "%";
            quit_pole_resets++;

            //animateQuitPage(removedPageIndex, 'bulk-load');
        } else {
            console.log("True outlier - Requires top insert");
            quit_top_inserts++;

            //Visualize top insert
            const { side, level } = getTargetLevelForPage(page);
            traceTreePath(side, "top", level);

            //animateQuitPage(removedPageIndex, 'top-insert');
        }
        if(page>quit_max)
            quit_max = page;
    }
    console.log("Finished processing page", page);
    quit_top_inserts_history.push(quit_top_inserts);
    quit_fast_inserts_history.push(quit_fast_inserts);
}

/*
 * Trace the tree path down to the given level
 */
function traceTreePath(side, mode = "top", targetLevel = 4) {
    const path = [];
    if (side === "left") {
        path.push("node-1", "node-2-left", "node-3-leftmost", "node-4-leftmost");
    } else {
        path.push("node-1", "node-2-right", "node-3-rightmost", "node-4-rightmost");
    }
    /*
    if (mode === "top") {
        // Highlight path down to targetLevel
        for (let i = 0; i < targetLevel; i++) {
            const nodeId = path[i];
            const node = document.getElementById(nodeId);
            if (node) {
                setTimeout(() => {
                    node.style.backgroundColor = "yellow";
                    setTimeout(() => {
                        node.style.backgroundColor = "#ccc";
                    }, delay*0.8);
                }, i * (delay*0.2));
            }
        }
    } else if (mode === "fast") {
        // Just flash green target node
        const nodeId =
            side === "left"
                ? `node-${targetLevel}-leftmost`
                : `node-${targetLevel}-rightmost`;
        const node = document.getElementById(nodeId);
        if (node) {
            node.style.backgroundColor = "green";
            setTimeout(() => {
                node.style.backgroundColor = "#ccc";
            }, delay*0.8);
        }
    }
    */
}

/*
 * Determine the correct tree side and level for this page
 */
function getTargetLevelForPage(page) {
    let side = page < 50 ? "left" : "right"; // adjust threshold
    let level = 4;

    if (pole.includes(page)) {
        level = 4;
    } else if (pole_next.length > 0 && page >= Math.min(...pole_next) && page <= Math.max(...pole_next)) {
        level = 4;
    } else if (pole_prev.length > 0 && page >= Math.min(...pole_prev) && page <= Math.max(...pole_prev)) {
        level = 3;
    } else if (page < Math.min(...pole_prev)) {
        level = 2;
    } else {
        level = 1;
    }

    return { side, level };
}

class Node {
    constructor(t, leaf) {
        this.t = t;
        this.leaf = leaf;
        this.keys = [];
        this.children = [];
        this.n = 0;
    }
}

class BTree {
    constructor(t) {
        this.t = t;
        this.root = new Node(t, true);

        // QuIT poles
        this.currPole = [];
        this.prevPole = [];
        this.nextPole = [];

        // Zone tracking
        this.levelMap = {};
    }

    insertWithLevel(page) {
        let level = 1;

        const insertRecursive = (node, key, currentLevel) => {
            let i = node.n - 1;

            if (node.leaf) {
                while (i >= 0 && node.keys[i] > key) {
                    node.keys[i + 1] = node.keys[i];
                    i--;
                }
                node.keys[i + 1] = key;
                node.n += 1;

                this.trackLevelKey(key, currentLevel);
                return currentLevel;
            } else {
                while (i >= 0 && node.keys[i] > key) i--;
                i++;
                if (node.children[i].n === 2 * this.t - 1) {
                    this.splitChild(node, i, node.children[i]);
                    if (node.keys[i] < key) i++;
                }
                return insertRecursive(node.children[i], key, currentLevel + 1);
            }
        };

        if (this.root.n === 2 * this.t - 1) {
            let newRoot = new Node(this.t, false);
            newRoot.children[0] = this.root;
            this.splitChild(newRoot, 0, this.root);
            this.root = newRoot;
        }

        return insertRecursive(this.root, page, level);
    }

    splitChild(parent, i, child) {
        let t = this.t;
        let newChild = new Node(t, child.leaf);
        newChild.n = t - 1;

        for (let j = 0; j < t - 1; j++) {
            newChild.keys[j] = child.keys[j + t];
        }

        if (!child.leaf) {
            for (let j = 0; j < t; j++) {
                newChild.children[j] = child.children[j + t];
            }
        }

        child.n = t - 1;

        for (let j = parent.n; j >= i + 1; j--) {
            parent.children[j + 1] = parent.children[j];
        }
        parent.children[i + 1] = newChild;

        for (let j = parent.n - 1; j >= i; j--) {
            parent.keys[j + 1] = parent.keys[j];
        }
        parent.keys[i] = child.keys[t - 1];

        parent.n += 1;
    }

    trackLevelKey(key, level) {
        if (!this.levelMap[level]) this.levelMap[level] = [];
        this.levelMap[level].push(key);
    }

    getZoneForPage(page, level) {
        const keysAtLevel = this.levelMap[level];
        if (!keysAtLevel || keysAtLevel.length === 0) return 'unknown';

        const sorted = [...keysAtLevel].sort((a, b) => a - b);
        const index = sorted.indexOf(page);
        if (index === -1) return 'not in level';

        const percent = index / sorted.length;

        if (level === 1) {
            return 'zone 1';
        } else if (level === 2) {
            return percent < 0.5 ? 'zone 1/2' : 'zone 2/2';
        } else {
            if (percent < 0.25) return 'zone 1/4';
            else if (percent < 0.5) return 'zone 2/4';
            else if (percent < 0.75) return 'zone 3/4';
            else return 'zone 4/4';
        }
    }

    getPoleForPage(page) {
        if (this.currPole.includes(page)) return 'currPole';
        if (this.prevPole.includes(page)) return 'prevPole';
        if (this.nextPole.includes(page)) return 'nextPole';
        return 'none';
    }
}

// =======================
// Create B+ Tree instance
// =======================
const MIN_DEGREE = 6;
const btree = new BTree(MIN_DEGREE);

// Save original quit()
const original_quit = quit;

quit = function () {
    original_quit.apply(this, arguments);
    if (!running) return;

    const page = inserted_data_quit[inserted_data_quit.length - 1];
    const level = btree.insertWithLevel(page);

    btree.currPole = [...pole];
    btree.prevPole = [...pole_prev];
    btree.nextPole = [...pole_next];
    const poleName = btree.getPoleForPage(page);
    const zone = btree.getZoneForPage(page, level);

    console.log(`[B+Tree] Page ${page} inserted into ${poleName} at tree level ${level}`);
    console.log(`Zone Mapping: ${zone}`);
    logPoleStatus(btree);
};

function logPoleStatus(btree) {
    /*
    console.log(
        `Poles Status:\n` +
        `prevPole: [${btree.prevPole.join(", ")}]\n` +
        `currPole: [${btree.currPole.join(", ")}]\n` +
        `nextPole: [${btree.nextPole.join(", ")}]\n` 
    );
    */
}