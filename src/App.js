import logo from './logo.svg';
import { Chart as ChartJS } from "chart.js/auto";
import { Line } from "react-chartjs-2";
import './App.css';

function App() {
  return (
    <div className="App">
      <div className="dataCard revenueCard">Chart 1</div>

      <div className="dataCard customerCard">Chart 2</div>

      <div className="dataCard categoryCard">Chart 3</div>
    </div>
  );
}

export default App;
