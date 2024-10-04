// Function to draw the chart
function drawChart() {
    var plot_data = generate_data(1000, false); // true = shuffled, false = sorted
    console.log(plot_data);
    var data = google.visualization.arrayToDataTable(plot_data);

    var options = {
        title: 'position vs. value comparison',
        hAxis: {title: 'Position', minValue: 0, maxValue: 1000},
        vAxis: {title: 'Value', minValue: 0, maxValue: 1000},
        legend: 'none',
        explorer: { 
        zoomDelta: 0.8
        }
    };

    var chart = new google.visualization.ScatterChart(document.getElementById('chart_div'));

    chart.draw(data, options);
}