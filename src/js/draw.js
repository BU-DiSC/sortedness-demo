/* 
 * Function to draw the chart
 */ 
function run_operations() {
    // parameters
    const minN = 20;
    const maxN = 10000;

    // Get the correct input for N
    let selectedN;
    if (document.getElementById('radioN1').checked) {
        selectedN = parseInt(document.getElementById('cmp-select-N').value);
    }
    else {
        selectedN = document.getElementById("manualN").value;
    }

    // Get the correct input for K
    let selectedK;
    if (document.getElementById('radioK1').checked) {
        selectedK = parseInt(document.getElementById('cmp-select-K').value);
    }
    else {
        selectedK = document.getElementById("manualK").value;
    }

    // Get the correct input for L
    let selectedL;
    if (document.getElementById('radioL1').checked) {
        selectedL = parseInt(document.getElementById('cmp-select-L').value);
    }
    else {
        selectedL = document.getElementById("manualL").value;
    } 

    // Get the correct input for B
    let selectedB;
    if (document.getElementById('radioB1').checked) {
        selectedB = parseFloat(document.getElementById('cmp-select-B').value);
    }
    else {
        selectedB = document.getElementById("manualB").value;
    } 

    let flag = true // flag to generate graph when parameters are acceptable
    
    // Put the inputs in console
    console.log("Input N: " + selectedN);
    console.log("Input K: " + selectedK);
    console.log("Input L: " + selectedL);
    console.log("Input B: " + selectedB);
    
    // Give error when parameters are not acceptable and prevent generating graph
    if (selectedN != parseInt(selectedN)) {
        alert("N should be an integer");
        flag = false;
    }
    else {
        if (selectedN < minN || selectedN >  maxN) {
            alert("N should be between " + minN + " and " + maxN);
            flag = false;
        }
    } 

    if (selectedK != parseInt(selectedK)) {
        alert("K should be an integer");
        flag = false;
    }
    else {
        if (selectedK < 0 || selectedK >  100) {
            alert("K should be between 0 and 100");
            flag = false;
        }
    }

    if (selectedL != parseInt(selectedL)) {
        alert("L should be an integer");
        flag = false;
    }
    else {
        if (selectedL < 0 || selectedL >  100) {
            alert("L should be between 0 and 100");
            flag = false;
        }
    }

    if (selectedB != parseFloat(selectedB)) {
        alert("B should be a float");
        flag = false;
    }
    else {
        if (selectedB < 0 || selectedB >  1) {
            alert("B should be between 0 and 1");
            flag = false;
        }
    }
    // Generate graph when parameters are acceptable
    if (flag == true) { 
        draw_chart(selectedN, selectedK, selectedL, selectedB);
    }
    else {
        console.log("Expecting correct input");
    }
}


function draw_chart(N, K, L, B) {
    const tickCount = 10;

    // Google charts uses the upper bound when generating 
    // ticks. This function manually creates the ticks 
    // using N. 
    function createTicks(N) {
        tickArr = [];
        tickArr.push(0);
        let n =  Math.round(N / tickCount);
        for (let i = n; i < N; i += n) {
            tickArr.push(i);
        }
        tickArr.push(N);

        return tickArr;
    }

    // Generate data
    var total_data = create_data(N, K, L, B);
    // Adjust data for plotting
    var plot_data = generate_data(N, total_data); 
    //console.log(plot_data);
    var data = google.visualization.arrayToDataTable(plot_data);
    
    // Options for the graph
    var options = {
        title: 'position vs. value comparison',
        hAxis: {title: 'Position', minValue: 0, maxValue: N, ticks: createTicks(N)},
        vAxis: {title: 'Value', minValue: 0, maxValue: N, ticks: createTicks(N)},
        legend: 'none',
        explorer: { 
            zoomDelta: 0.8,
        }
    };
    
    // Draw the chart
    var chart = new google.visualization.ScatterChart(document.getElementById('chart_div'));
    chart.draw(data, options);
    
    // Output info besides the chart
    document.getElementById("info_div").innerHTML = `
        <h5>Selected Values</h5>
        <p><strong>N:</strong> ${N}</p>
        <p><strong>K:</strong> ${K}%</p>
        <p><strong>L:</strong> ${L}%</p>
        <p><strong>B:</strong> ${B}</p>
    `;
}