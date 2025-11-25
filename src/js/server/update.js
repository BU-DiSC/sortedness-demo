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
}