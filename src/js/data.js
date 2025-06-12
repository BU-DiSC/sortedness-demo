/*
 * Function to generate the data for the chart
 */


function create_data(N, K, L, B) {
  let title = "N" + N + "_K" + K + "_L" + L + "_B" + B;
  data = map[title];
  console.log(data);
  return data;

  /*
  const fs = require('fs');

  // Path to the file
  const filePath = "src/workloads/" + title;

  // Read the file asynchronously
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading the file:', err);
      return;
    }

    // Split the file content by newline characters and convert to numbers
    const numberArray = data.split('\n').map(line => parseInt(line, 10)).filter(num => !isNaN(num));

    console.log("Array of numbers:", numberArray);
  });

  // Log the inputs for the function
  console.log("generate_data( N=" + N + ", K=" + K + ", L=" + L + ", B=" + B + " )");

  /*
  sorted = false;
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

    console.log(shuffled_data);

    return shuffled_data;
    

    return numberArray;
    */
}

function create_inversion_data(N, I) {
  // Uses Fisher-Yates shuffle
  let arr = Array.from({ length: N }, (_, i) => i + 1);
  for (let i = N - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  function countInversions(arr) {
    let count = 0;
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[i] > arr[j]) count++;
      }
    }
    return count;
  }

  let currentInversions = countInversions(arr);

  while (currentInversions !== I) {
    for (let i = 0; i < N - 1 && currentInversions < I; i++) {
      for (let j = i + 1; j < N && currentInversions < I; j++) {
        if (arr[i] < arr[j]) {
          [arr[i], arr[j]] = [arr[j], arr[i]];
          currentInversions++;
        }
      }
    }
    if (currentInversions > I) {
      for (let i = 0; i < N - 1 && currentInversions > I; i++) {
        for (let j = i + 1; j < N && currentInversions > I; j++) {
          if (arr[i] > arr[j]) {
            [arr[i], arr[j]] = [arr[j], arr[i]];
            currentInversions--;
          }
        }
      }
    }
  }
  
  console.log("Inversion data: ");
  console.log(arr);
  return arr;
}

function generate_data(N, data)
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

    console.log(plot_data);

    return plot_data;
}