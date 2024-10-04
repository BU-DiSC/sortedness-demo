// Function to generate the data for the chart
function generate_data(N, sorted = true)
{
  // shuffle array function for shuffled data
    const shuffleArray = array => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
      }
    };
    // our API expects data to be an array of [key, value] pairs
    // where key is the unique identifier for the data point
    // and value is the value of the data point
    let data_points = [];
    for(let i = 1; i <= N; i++)
    {
        data_points.push(i);
    }

    // copy data and shuffle it randomly 
    let shuffled_data = data_points.slice();
    shuffleArray(shuffled_data);
    
    // create data array
    let plot_data = [];
    plot_data.push(['Position', 'Value']);
    for(let i = 0; i < N; i++)
    {
        plot_data.push([data_points[i], sorted ? data_points[i] : shuffled_data[i]]);
    }

    return plot_data;
}