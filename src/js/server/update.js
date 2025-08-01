let PRESELECTED_N = 5000;
let PRESELECTED_K = 20;
let PRESELECTED_L = 10;
let PRESELECTED_B = 0.3;
let PRESELECTED_I = 0;

var firstChangeDone = false;

// Creates a shallow copy of values in the server to delete from 
let valsToEliminate = vals.slice(); 

console.log("Initial values:");
console.log(valsToEliminate);

// Function for onchange
function update() {
    // Gets the select elements
    const fieldN = document.getElementById("cmp-select-N")
    const fieldK = document.getElementById("cmp-select-K");
    const fieldL = document.getElementById("cmp-select-L");
    const fieldB = document.getElementById("cmp-select-B");
    //const fieldI = document.getElementById("cmp-select-I");

    // Gets the value of the select elements
    let selectedN = fieldN.value;
    let selectedK = fieldK.value;
    let selectedL = fieldL.value;
    let selectedB = fieldB.value;
    //let selectedI = fieldI.value;

    /*
    if (!firstChangeDone) {
        firstChangeDone = true;

        var changedValue;
        // Check which field was changed
        let changedField = '';
        if (selectedN != PRESELECTED_N) {
            changedField = 'N';
            changedValue = selectedN;
        }
        else if (selectedK != PRESELECTED_K) {
            changedField = 'K';
            changedValue = selectedK;
        }
        else if (selectedL != PRESELECTED_L) {
            changedField = 'L';
            changedValue = selectedL;
        }
        else if (selectedB != PRESELECTED_B) {
            changedField = 'B';
            changedValue = selectedB;
        }

        console.log("changedField: " + changedField);
        console.log("changedValue: " + changedValue);

        // For all values in valsToEliminate
        for (let i = 0; i < valsToEliminate.length; i++) {
            if (valsToEliminate[i][changedField] != changedValue) {
                valsToEliminate.splice(i--, 1);
                continue;
            }
        }

        console.log("The updated values left:");
        console.log(valsToEliminate);

        // Lock the changed field to only show the selected value
        if (changedField === 'N') {
            fieldN.length = 0;
            let op = document.createElement('option');
            op.value = selectedN;
            op.text = selectedN;
            fieldN.appendChild(op);
        } else if (changedField === 'K') {
            fieldK.length = 0;
            let op = document.createElement('option');
            op.value = selectedK;
            op.text = selectedK + "%";
            fieldK.appendChild(op);
        } else if (changedField === 'L') {
            fieldL.length = 0;
            let op = document.createElement('option');
            op.value = selectedL;
            op.text = selectedL + "%";
            fieldL.appendChild(op);
        } else if (changedField === 'B') {
            fieldB.length = 0;
            let op = document.createElement('option');
            op.value = selectedB;
            op.text = selectedB;
            fieldB.appendChild(op);
        }

        // Update N dropdown options
        if (changedField !== 'N') {
            let uniqueN = [...new Set(valsToEliminate.map(p => p.N))].sort((a, b) => a - b);
            fieldN.length = 0;
            let emptyOp = document.createElement('option');
            emptyOp.value = "";
            emptyOp.text = "";  
            fieldN.appendChild(emptyOp);
            for (const value of uniqueN) {
                let op = document.createElement('option');
                op.value = value;
                op.text = value;
                fieldN.appendChild(op); 
            }
        }

        // Update K dropdown options
        if (changedField !== 'K') {
            let uniqueK = [...new Set(valsToEliminate.map(p => p.K))].sort((a, b) => a - b);
            fieldK.length = 0;
            let emptyOp = document.createElement('option');
            emptyOp.value = "";
            emptyOp.text = "";
            fieldK.appendChild(emptyOp);
            for (const value of uniqueK) {
                let op = document.createElement('option');
                op.value = value;
                op.text = value + "%";
                fieldK.appendChild(op);
            }
        }

        // Update L dropdown options
        if (changedField !== 'L') {
            let uniqueL = [...new Set(valsToEliminate.map(p => p.L))].sort((a, b) => a - b);
            fieldL.length = 0;
            let emptyOp = document.createElement('option');
            emptyOp.value = "";
            emptyOp.text = "";
            fieldL.appendChild(emptyOp);
            for (const value of uniqueL) {
                let op = document.createElement('option');
                op.value = value;
                op.text = value + "%";
                fieldL.appendChild(op);
            }
        }

        // Update B dropdown options
        if (changedField !== 'B') {
            let uniqueB = [...new Set(valsToEliminate.map(p => p.B))].sort((a, b) => a - b);
            fieldB.length = 0;
            let emptyOp = document.createElement('option');
            emptyOp.value = "";
            emptyOp.text = "";
            fieldB.appendChild(emptyOp);
            for (const value of uniqueB) {
                let op = document.createElement('option');
                op.value = value;
                op.text = value;
                fieldB.appendChild(op);
            }
        }

    }
    else {
        

        // For all values in valsToEliminate
        for (let i = 0; i < valsToEliminate.length; i++) {
            // If N has a value that doesn't match, remove from list
            if (selectedN != "") {
                if (valsToEliminate[i].N != selectedN) {
                    valsToEliminate.splice(i--, 1);
                    continue;
                }
            }
            
            // If K has a value that doesn't match, remove from list
            if (selectedK != "") {
                if (valsToEliminate[i].K != selectedK) {
                    valsToEliminate.splice(i--, 1);
                    continue;
                }
            }

            // If L has a value that doesn't match, remove from list
            if (selectedL != "") {
                if (valsToEliminate[i].L != selectedL) {
                    valsToEliminate.splice(i--, 1);
                    continue;
                }
            }

            // If B has a value that doesn't match, remove from list
            if (selectedB != "") {
                if (valsToEliminate[i].B != selectedB) {
                    valsToEliminate.splice(i--, 1);
                    continue;
                }
            }
        }

        console.log("The updated values left:");
        console.log(valsToEliminate);

        // If N is selected lock N and adjust I fields
        if (selectedN != "") {
            fieldN.length = 0;
            let op = document.createElement('option');
            op.value = selectedN;
            op.text = selectedN;
            fieldN.appendChild(op);

            if (selectedI == "") {
                // adjust I fields 
                fieldI.length = 0; // clear I
                // create empty input
                op = document.createElement('option');
                op.value = "";
                op.text = "";
                fieldI.appendChild(op);
                
                let maxI = (parseInt(selectedN) * (parseInt(selectedN) - 1)) / 2;
                for (let i = 0; i < 100; i += 10) {
                    let op = document.createElement('option');
                    op.value = (maxI * i) / 100;
                    op.text = (maxI * i) / 100;
                    fieldI.appendChild(op);
                }
            }
        }
        // Else adjust N dropdown
        else {
            fieldN.length = 0; // clear fieldN
            // create empty input
            let op = document.createElement('option');
            op.value = "";
            op.text = "";
            fieldN.appendChild(op);
            let alreadyAdded = []; // avoid duplicates
            // Store in temp array, sort it, then add
            let toSortN = [];
            for (const p of valsToEliminate) {
                if (!alreadyAdded.includes(p.N)) {
                    toSortN.push(p.N);
                    alreadyAdded.push(p.N);
                }
            }
            toSortN.sort((a, b) => a - b);
            for (const n of toSortN) {
                let op = document.createElement('option');
                op.value = n;
                op.text = n;
                fieldN.appendChild(op);
            }
        }

        // If K is selected lock K
        if (selectedK != "") {
            // the only value in dropdown is the selected one
            fieldK.length = 0;
            let op = document.createElement('option');
            op.value = selectedK;
            op.text = selectedK + "%";
            fieldK.appendChild(op);
        }
        // Else adjust K dropdown
        else {
            fieldK.length = 0; // clear fieldK
            // create empty input
            let op = document.createElement('option');
            op.value = "";
            op.text = "";
            fieldK.appendChild(op);
            let alreadyAdded = []; // avoid duplicates
            let toSortK = [];
            for (const p of valsToEliminate) {
                if (!alreadyAdded.includes(p.K)) {
                    toSortK.push(p.K);
                    alreadyAdded.push(p.K);
                }
            }
            // Store in temp array, sort it, then add
            toSortK.sort((a, b) => a - b);
            for (const k of toSortK) {
                let op = document.createElement('option');
                op.value = k;
                op.text = k;
                fieldK.appendChild(op);
            }
        }

        // If L is selected lock L
        if (selectedL!= "") {
            // the only value in dropdown is the selected one
            fieldL.length = 0;
            let op = document.createElement('option');
            op.value = selectedL;
            op.text = selectedL + "%";
            fieldL.appendChild(op);
        }
        // Else adjust L dropdown
        else {
            fieldL.length = 0; // clear fieldL
            // create empty input
            let op = document.createElement('option');
            op.value = "";
            op.text = "";
            fieldL.appendChild(op);
            let alreadyAdded = []; // avoid duplicates
            // Store in temp array, sort it, then add
            let toSortL = [];
            for (const p of valsToEliminate) {
                if (!alreadyAdded.includes(p.L)) {
                    toSortL.push(p.L);
                    alreadyAdded.push(p.L);
                }
            }
            toSortL.sort((a, b) => a - b);
            for (const l of toSortL) {
                let op = document.createElement('option');
                op.value = l;
                op.text = l;
                fieldL.appendChild(op);
            }
        }

        // If B is selected lock B
        if (selectedB!= "") {
            fieldB.length = 0;
            let op = document.createElement('option');
            op.value = selectedB;
            op.text = selectedB;
            fieldB.appendChild(op);
        }
        // Else adjust B dropdown
        else {
            fieldB.length = 0; // clear fieldB
            // create empty input
            let op = document.createElement('option');
            op.value = "";
            op.text = "";
            fieldB.appendChild(op);
            let alreadyAdded = []; // avoid duplicates
            // Store in temp array, sort it, then add
            let toSortB = [];
            for (const p of valsToEliminate) {
                if (!alreadyAdded.includes(p.B)) {
                    toSortB.push(p.B);
                    alreadyAdded.push(p.B);
                }
            }
            toSortB.sort((a, b) => a - b);
            for (const b of toSortB) {
                let op = document.createElement('option');
                op.value = b;
                op.text = b;
                fieldB.appendChild(op);
            }
        }

        if (selectedI != "") {
            fieldI.length = 0;
            let op = document.createElement('option');
            op.value = selectedI;
            op.text = selectedI;
            fieldI.appendChild(op);
        }
    }
        */
}