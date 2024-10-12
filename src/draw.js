google.charts.load('current', {'packages':['corechart']});

// Function to draw the chart
function drawChart() {

    // parameters
    const minN = 20;
    const maxN = 10000;
    const tickCount = 10;


    let selectedN;
    if (document.getElementById('radioN1').checked) {
        selectedN = parseInt(document.getElementById('cmp-select-N').value);
    }
    else {
        selectedN = document.getElementById("manualN").value;
    }

    let selectedK;
    if (document.getElementById('radioK1').checked) {
        selectedK = parseInt(document.getElementById('cmp-select-K').value);
    }
    else {
        selectedK = document.getElementById("manualK").value;
    }

    let selectedL;
    if (document.getElementById('radioL1').checked) {
        selectedL = parseInt(document.getElementById('cmp-select-L').value);
    }
    else {
        selectedL = document.getElementById("manualL").value;
    } 

    let flag = true

    console.log("Selected N: " + selectedN);
    console.log("Selected K: " + selectedK);
    console.log("Selected L: " + selectedL);

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


    if (flag == true) {
        
        function createTicks(selectedN) {
            tickArr = [];
            tickArr.push(0);
            let n =  Math.round(selectedN / tickCount);
            for (let i = n; i < selectedN; i += n) {
                tickArr.push(i);
            }
            tickArr.push(selectedN);

            return tickArr;
        }
        

        var plot_data = generate_data(selectedN, false); // true = shuffled, false = sorted
        console.log(plot_data);
        var data = google.visualization.arrayToDataTable(plot_data);
    
        var options = {
            title: 'position vs. value comparison',
            hAxis: {title: 'Position', minValue: 0, maxValue: selectedN, ticks: createTicks(selectedN)},
            vAxis: {title: 'Value', minValue: 0, maxValue: selectedN, ticks: createTicks(selectedN)},
            legend: 'none',
            explorer: { 
                zoomDelta: 0.8,
            }
        };
    
        var chart = new google.visualization.ScatterChart(document.getElementById('chart_div'));
    
        chart.draw(data, options);

        document.getElementById("info_div").innerHTML = `
            <h5>Selected Values</h5>
            <p><strong>N:</strong> ${selectedN}</p>
            <p><strong>K:</strong> ${selectedK}%</p>
            <p><strong>L:</strong> ${selectedL}%</p>
        `;

    }




}