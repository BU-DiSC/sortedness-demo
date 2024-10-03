
const shuffleArray = array => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  };

export function generate_data(N, sorted = true)
{
    // our API expects data to be an array of [key, value] pairs
    // where key is the unique identifier for the data point
    // and value is the value of the data point
    let data = [];
    for(let i = 1; i <= N; i++)
    {
        data.push(i);
    }

    // copy data and shuffle it randomly 
    let shuffled_data = data.slice();
    shuffleArray(shuffled_data);

    let plot_data = [];
    plot_data.push(['x', 'y']);
    for(let i = 0; i < N; i++)
    {
        plot_data.push([i, sorted ? data[i] : shuffled_data[i]]);
    }

    return plot_data;
}