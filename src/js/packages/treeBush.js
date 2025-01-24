const level_physical_capacities = [48, 36, 27, 22, 17, 12, 9, 6, 4]
const color_table=["#F5B041","#52BE80","#2E86C1","#EC7063","#ff8080","#ffb980","#edfa00","#00fa32","#0021fa","#8900fa","#c7041e"]
const name_table=["Vanilla-LSM","Partial Compaction","Hybrid-Strategy","Build-Your-Own"]
var traces_for_plots = {}
var plotted_metrics = ["level", "run", "num_compaction","avg_cmpct_size",
"avg_cmpct_lat","ingest_cost","zr_point_lookup_cost","non_zr_point_lookup_cost",
"short_range_lookup_cost","long_range_lookup_cost","space_amplification_cost",
"storage_space"]

// Event handling
document.addEventListener("DOMContentLoaded",
function (event) {
// N: number of entries
// L: number of Levels
// E: size of an entry(bytes)
// T: size ratio
// M: actual buffer capacity(MB);
// Mbf: memory allocated to bloomFilters
// Mf: memory allocated to FencePointers
// MP: Merge policy;
// f: file size in terms of buffer
// F: file size in #entries
// P: actual page size in bytes;
// B: page size in #entries
// PB:  buffer capacity in terms of #entries
// ceilling(M/B): #pages flushed by buffer;
// ceillign(N/B): #pages containing all entries
// ceilling(M/F): #files flushed by buffer;
// ceilling(N/F): #files containing all entreis
// s: selectivity of a range lookup
// mu(μ): storage sequential over random access speed
// phi(Φ): storage write over read speed
// prefix: configurate target{cmp: comparative analysis, indiv: inidividual analysis}\
// K, Z: tunning parameters
// suffix: result targets subclasses {vlsm, rlsm, dlsm, osm}
// preMP: previous state of merge policy before switching analysis mode
class CumulativeStats {

}

class LSM_tree {
  constructor(n=0) {
      this._DEFAULT = {
          N: 0,
          levels: [0],
          K: 1,
          Z: 1,
          X: 0,
          T: 2,
          F: 16384,
          phi: 1,
          mu: 1,
          partial_compact: false,
          bg_compact: false,
          bg_threshold: 1.0
      };
      this.N = n;
      this.K = this._DEFAULT.K;
      this.levels = this._DEFAULT.levels;
      this.Z = this._DEFAULT.Z;
      this.X = this._DEFAULT.X;
      this.T = this._DEFAULT.T;
      this.F = this._DEFAULT.F;
      this.mu = this._DEFAULT.mu;
      this.phi = this._DEFAULT.phi;
      this.partial_compact = this._DEFAULT.partial_compact;
      this.bg_compact = this._DEFAULT.bg_compact;
      this.bg_threshold = this._DEFAULT.bg_threshold;
      if(this.partial_compact){
        this.K = 1;
        this.Z = 1;
      }
  }

  get structure(){
    return this.levels;
  }

  flush_one_buffer(){
    var result = {num_compaction:0,max_io_cmpct:0,summed_read_cmpct:0,summed_write_cmpct:0}

    var tmp_ratio = 1;
    if(this.partial_compact && this.bg_compact) tmp_ratio = this.bg_threshold;

    if(this.levels[0] != 0){
      if((this.levels.length == 1 && this.Z == 1) || this.K == 1){
        result.num_compaction++;
        num_read = this.levels[0];
        num_write = num_read + 1;
        result.summed_read_cmpct += num_read;
        result.summed_write_cmpct += num_write;
        result.max_io_cmpct = Math.max(result.max_io_cmpct, num_read/this.mu + num_write/this.phi);
      }else{
        var run_capacity = Math.ceil(this.T/this.K);
        var extra_num = this.levels[0]%run_capacity;
        if(extra_num > 0){
          result.num_compaction++;
          num_read = extra_num;
          num_write = extra_num + 1;
          result.summed_read_cmpct += num_read;
          result.summed_write_cmpct += num_write;
          result.max_io_cmpct = Math.max(result.max_io_cmpct, num_read/this.mu + num_write/this.phi);
        }

      }
    }
    this.levels[0]++;
    var cur_lvl = 0;
    var num_read = 0;
    var num_write = 0;
    while(this.levels[cur_lvl] >= Math.pow(this.T, cur_lvl+1)*tmp_ratio){
      if(this.levels.length - 1 == cur_lvl){
        this.levels.push(0)
      }
      if(this.partial_compact){
        if(this.levels[cur_lvl+1] != 0){
          result.num_compaction++;
          num_read = 1 + Math.min(this.T, this.levels[cur_lvl+1]);
          num_write = num_read;
          result.summed_read_cmpct += num_read;
          result.summed_write_cmpct += num_write;
          result.max_io_cmpct = Math.max(result.max_io_cmpct, num_read/this.mu + num_write/this.phi);
        }
        this.levels[cur_lvl]--;
        this.levels[cur_lvl+1]++;


      }else{
        // merge into a single run first
        if((this.Z != 1 && cur_lvl == 0) || this.K != 1){
          result.num_compaction++;
          result.summed_read_cmpct += this.levels[cur_lvl];
          result.summed_write_cmpct += this.levels[cur_lvl];
          result.max_io_cmpct = Math.max(result.max_io_cmpct, this.levels[cur_lvl]/this.mu/1024/1024 + num_write/this.phi/1024/1024);
        }
        // merge into the next level
        if(this.levels[cur_lvl+1] != 0){
          var run_capacity = Math.ceil(Math.pow(this.T, cur_lvl+2)/this.K);
          if(cur_lvl + 1> this.X || cur_lvl + 1 == this.levels.length - 1){
            run_capacity = Math.ceil(Math.pow(this.T, cur_lvl+2)/this.Z);
          }
          var extra_num = this.levels[cur_lvl+1]%run_capacity;
          if(extra_num > 0){
            result.num_compaction++;
            num_read = extra_num + this.levels[cur_lvl];
            num_write = num_read;
            result.summed_read_cmpct += num_read;
            result.summed_write_cmpct += num_write;
            result.max_io_cmpct = Math.max(result.max_io_cmpct, num_read/this.mu + num_write/this.phi);
          }
        }
        this.levels[cur_lvl+1] += this.levels[cur_lvl];
        this.levels[cur_lvl] = 0;
      }


      cur_lvl++;
    }
    return result;
  }

  getRunsPerLvl(){
    var result = [];
    if(this.levels.length == 1){
      if(this.levels[0] > 0){
        return [1];
      }else{
        return [0];
      }
    }
    for(let i = 0; i < this.levels.length; i++){
      if(this.levels[i] > 0){
        if((this.K == 1 && this.Z == 1) || this.partial_compact){
          result.push(1);
        }else if(this.K != 1){
          if(i < this.X && i < this.levels.length - 1){
            result.push(Math.ceil(this.levels[i]/(Math.ceil(Math.pow(this.T, i+1)/this.K))));
          }else if(this.Z != 1){
            result.push(Math.ceil(this.levels[i]/(Math.ceil(Math.pow(this.T, i+1)/this.Z))));
          }else{
            result.push(1);
          }
        }else{
          if(i < this.X || this.Z == 1){
            result.push(1);
          }else{
            result.push(Math.ceil(this.levels[i]/(Math.ceil(Math.pow(this.T, i+1)/this.K))));
          }
        }

      }else{
        result.push(0);
      }
    }
    return result;

  }

  getEntriesPerLvl(){
    return this.levels;
  }


}
class LSM {
    constructor(prefix = "", suffix = "") {
        this._DEFAULT = {
            T: 2,
            E: 1048576,
            N: 1,
            P: 1048576,
            M: 1048576, //1MB
            Mbf: 1024,
            Mf: 0,
            MP: 0,
            f: 1,
            s: 50,
            mu: 1,
            phi: 1,
            X: 0,
        };
        this.MP = this.DEFAULT.MP;
        this.prefix = prefix;
        this.suffix = suffix;
        this.preMP = this.MP;
		this.NSortedRun = 0;
		this.NCompaction = 0;
    this.plotIdx = 0;

        if(prefix) {
            this.T = document.querySelector(`#${prefix}-input-T`).value;
            this.E = convertToBytes(`#${prefix}-select-E`, document.querySelector(`#${prefix}-input-E`).value);
            this.N = document.querySelector(`#${prefix}-input-N`).value;
            this.M = convertToBytes(`#${prefix}-select-M`, document.querySelector(`#${prefix}-input-M`).value);
            this.f = document.querySelector(`#${prefix}-input-f`).value;
            this.P = convertToBytes(`#${prefix}-select-P`, document.querySelector(`#${prefix}-input-P`).value);
            this.Mbf = convertToBytes(`#${prefix}-select-Mbf`, document.querySelector(`#${prefix}-input-Mbf`).value);
            this.s = document.querySelector(`#${prefix}-input-s`).value;
            this.mu = document.querySelector(`#${prefix}-input-mu`).value;
            this.phi = document.querySelector(`#${prefix}-input-phi`).value;
			this.NTotal = this.N;
      this.PB = this.P * this.B;
      if(this.name == "OSM"){
        this.X = document.querySelector(`#${prefix}-num-tired-level-input`).value;
      }else if(this.name == "DostoevskyLSM"){
        this.X = this._getL(this.NTotal - this.NTotal%this.PB) - 1;
      }

        } else {
            this.T = this.DEFAULT.T;
            this.E = this.DEFAULT.E;
            this.N = this.DEFAULT.N;
            this.M = this.DEFAULT.M;
            this.f = this.DEFAULT.f;
            this.P = this.DEFAULT.P;
            this.Mbf = this.DEFAULT.Mbf;
            this.s = this.DEFAULT.s;
            this.mu = this.DEFAULT.mu;
            this.phi = this.DEFAULT.phi;
			this.NTotal = this.N;
            this.PB = this.P * this.B;
      this.X = this.DEFAULT.X;
        }

        this.KEY_SIZE = this.E/2;
        // this.L = this._getL();
		this.cumulativeMeta = {ratio: 0, size: 0, tail: 0, totalCompLat:0, totalCompSize:0, totalSize:0, maxLat: 0, numComp: 0};
		this._clearCumulativeMeta();
		this.cumulativeData = [];
    this.cumulativeLevelThreshold = [0];
		this._prepareCumulative();
    }

    get T() {
        return this._T;
    }
    get E() {
        return this._E;
    }
    get N() {
        return this._N;
    }
    get M() {
        return this._M;
    }
    get Mbf() {
        return this._Mbf;
    }
    get P() {
        return Math.floor(this._M/this._P);
    }
    get B() {
        return Math.floor(this._P/this._E);
    }
    get PB() {
        return this._PB;
    }
    get MP() {
        return this._MP;
    }
    get L() {
        return this._L;
    }
    get f() {
        return this._f;
    }
    get F() {
        return Math.floor(this._M*this._f / this._E);
    }
    get s() {
        return this._s;
    }
    get mu() {
        return this._mu;
    }
    get phi() {
        return this._phi;
    }
    get K(){
        if(this.MP || this.name === "DostoevskyLSM" || this.name === "OSM") return this.T;
        else return 1;
    }
    get Z() {
        if (!this.MP || this.name === "DostoevskyLSM" || this.name === "OSM") return 1;
        else return this.T;
    }
    get prefix() {
        return this._prefix;
    }
    get suffix() {
        return this._suffix;
    }
    get preMP() {
        return this._preMP;
    }
    get DEFAULT() {
        return this._DEFAULT;
    }
    get name() {
        return this.__proto__.constructor.name;
    }
    set T(ratio) {
        this._T = parseInt(ratio);
        return this._T;
    }
    set E(entrySize) {
        this._E = parseFloat(entrySize);
        return this._E;
    }
    set N(entryNum) {
        this._N = parseFloat(entryNum);
        return this._N;
    }
    set M(bufferSize) {
        this._M = parseFloat(bufferSize);
        return this._M;
    }
    set Mbf(filterSize) {
        this._Mbf = parseFloat(filterSize);
        return this._Mbf;
    }
    set P(pageSize) {
        this._P = parseFloat(pageSize);
        return this._P;
    }
    set PB(entryNum) {
        this._PB = entryNum;
        return this._PB;
    }
    set MP(mergePolicy) {
        this._MP = parseInt(mergePolicy);
        return this._MP;
    }
    set f(fileSize) {
        this._f = parseFloat(fileSize);
        return this._f;
    }
    set L(level) {
        this._L = parseInt(level);
        return this._L;
    }
    set s(selectivity) {
        this._s = this.N * parseFloat(selectivity/100);
        return this._s;
    }
    set mu(constant) {
        this._mu = parseFloat(constant);
        return this._s;
    }
    set phi(constant) {
        this._phi = parseFloat(constant);
        return this._phi;
    }
    set prefix(prefix) {
        this._prefix = prefix;
        return this._prefix;
    }
    set suffix(prefix) {
        this._suffix = prefix;
        return this._suffix;
    }
    set preMP(mergePolicy) {
        this._preMP = parseInt(mergePolicy);
        return this._preMP;
    }
    set DEFAULT(defaultObj) {
        this._DEFAULT = defaultObj;
        return this._DEFAULT;
    }
    _isAllInBuffer() {
        return this.N <= this.PB;
    }
    /* Get the number of entries eventually flushed to level 1 when buffer is not full */
    _getExtraEntries() {
        return this.N % this.PB;
    }

    _getL(entryNum = this.N - this._getExtraEntries()) {
        // entryNum must > 0
        if (entryNum == 0) return 1;
        var L;
        var l1_cap = this.PB * (this.T - 1);
        var log = entryNum * (this.T - 1) / l1_cap;
        L = Math.ceil(getBaseLog(this.T, log));
        return (L < 1) ? 1 : L;
    }

    /* Having known the ith level,
     * Return #entires a run could contain at that level
     * Computing based on the buffer capacity in terms of #entries
     */
    _getRunCapacity(ith) {
        if (this.MP && ith) return this._getLevelSpace(ith) / this.T;   // level 0 = no tier
        else return this._getLevelCapacity(ith);
    }

    /* Assumed maximal space of PB*T
     * Only used when computing the rate for leveling
     */
    _getLevelSpace(ith) {
        return this.PB * Math.pow(this.T, ith);
    }
    /* Actual maximal capacity that can be reached
     * PB*(T-1), except the level 1
     */
    _getLevelCapacity(ith) {
        var l1_cap = this.PB * (this.T - 1);
        return l1_cap * Math.pow(this.T, ith - 1);
    }
    _sumLevelCapacity(levels) {
        var sum = 0;
        for (let i = 1; i <= levels; i++) {
            sum += this._getLevelCapacity(i);
        }
        return sum;
    }

    /* Based on the buffer capacity of #ENTRY,
     * compute the number of entries per run for jth run in ith level;
     */
    _getEntryNum(ith, jth, run_cap) {
        var cur_cap = this._sumLevelCapacity(ith) + this._getExtraEntries();
        var li_cap = this._getLevelCapacity(ith);
        var isLastLevel = ith === this.L;
        if (ith === 1) {
            if (this.MP) {
                if (isLastLevel) {
                    for (var j = 0; j < this.T - 1; j++) {
                        if ((j + 1) * run_cap >= this.N) break;
                    }
                    if (jth > j) return 0;
                    else if (jth < j) return run_cap;
                    else return this.N - jth * run_cap;
                } else {
                    if (jth === this.T - 1) return this._getExtraEntries();
                    else return run_cap;
                }
            } else {
                if (isLastLevel) return this.N;
                return li_cap + this._getExtraEntries();
            }
        }
        if (isLastLevel) {
            var offset = this.N - cur_cap + li_cap;
            if(this.MP) {
                for (var j = 0; j < this.T - 1; j++) {
                    if ((j + 1) * run_cap >= offset) break;
                }
                if (jth > j) return 0;
                else if (jth < j) return run_cap;
                else return offset - jth * run_cap;
            } else {     // not reaching the last level
                return offset;
            }
        } else {
            if (this.MP) {
                if (jth === this.T - 1) return 0;
                else return run_cap;
            } else {
                return li_cap;
            }
        }
    }

    /* Compute the number of entries in ith level;
     * Return a string to be displayed when triggering ToolTip
     */
    _getTipText(ith, run_cap, entry_num, file_num) {
        var text = "";
        if (this.MP) {
            text =  "Level " + ith + ": This run contains " + entry_num + " entries in " + file_num + " files, [capacity: " + run_cap + " entries (" + Math.ceil(run_cap/this.F) + " files)]";
        } else {
             text = "Level " + ith + ": " + entry_num + " entries in " + file_num + " files, [capacity: " + run_cap + " entries (" + Math.ceil(run_cap/this.F) + " files)]";
        }
        return text;
    }
    /* Calculate current amount and set the width of runs
     * Return a list of button objects
     */
    _getBtns(elem, level, ratio) {
        var runs = [];
        var run_width = 0;
        var button = null;
        var level_space = 0;
        var context = "";
        var getWidth = function(i) {
           var coef = 1;
            var base_width = 10;
            var client_width = Math.ceil(elem.clientWidth * 0.9) - 1;  // -1 to avoid stacking
            var m = client_width / Math.pow(ratio, level);   // level0 actual width;
            if (m < base_width) {
                coef = Math.pow(client_width / base_width, 1 / level) / ratio;
                m  = base_width;
            }
            return m * Math.pow(coef * ratio, i) + "px";
			/*var p_cap = 4;
			if (i <= 8)
				p_cap = level_physical_capacities[8 - i];
			return elem.clientWidth * p_cap / 36 + "px";*/
        };

        for (var i = 1; i <= level; i++) {
            run_width = getWidth(i);
            button = createBtn(run_width);
            level_space = this._getLevelSpace(i);
			//console.log("level cap:", level_space);
            context = this._getTipText(i, level_space, 0, 0);   // jth run = 0;
            setToolTip(button, "left", context);
            setRunGradient(button, 0);
            runs[i] = button;
        }
        return runs;
    }

    _getBtnGroups(elem, level, ratio) {
        // Return a list of lsm-btn-group obejcts
        var btn_groups = [];
        var max_runs = (ratio < 5) ? ratio : 5;
        var run_width = 0;
        var group_wrap = null;
        var run_cap = 0;
        var context = "";

        var getWidth = function(i) {
            // Return the width for each button in a btn-group regarding to tiering
            // if (level === 0) return elem.clientWidth + "px";
            var base_width = 10;
            var margin = (max_runs - 2) * 4 + 4;
            var l1_width = max_runs * base_width + margin;   // invariant: level1 width
            var coef = 1;
            var client_width = Math.ceil(elem.clientWidth * 0.9) - 1;  // -1 to avoid stacking
            var m = client_width / Math.pow(max_runs, level - 1);    // level1 acutal width

            if (m < l1_width) {
                coef = Math.pow(client_width / l1_width, 1 / (level - 1)) / max_runs;
                m  = l1_width;
            }
            if (i > 1) return (m * Math.pow(coef * max_runs, i - 1) - margin) / max_runs + "px";
            else return (m - margin) / max_runs + "px";
        }

        for (var i = 1; i <= level; i++) {
            run_width = getWidth(i);
            group_wrap = document.createElement("div");
            group_wrap.setAttribute("class", "lsm-btn-group");
            run_cap = this._getRunCapacity(i);

            for (var j = 0; j < max_runs; j++) {
                var child = null;
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                    child = createDots(run_width);
                    context = "This level contains " + ratio + " runs in total";
                }
                else {
                    child = createBtn(run_width);
                    context = this._getTipText(i, run_cap, 0, 0);
                    setRunGradient(child, 0);
                }
                setToolTip(child, "left", context);
                group_wrap.appendChild(child);
            }
            btn_groups[i] = group_wrap;
        }
        return btn_groups;
    }

    /* update current state */
    update(prefix, mergePolicy = this.MP) {
        this.prefix = prefix;
        this.MP = mergePolicy;
        this.T = document.querySelector(`#${prefix}-input-T`).value;
        this.E = convertToBytes(`#${prefix}-select-E`, document.querySelector(`#${prefix}-input-E`).value);
        //this.N = document.querySelector(`#${prefix}-input-N`).value;
		this.NTotal = document.querySelector(`#${prefix}-input-N`).value;
		//this.N = window.progressSlider.getValue();
		if (window.focusedTree == "default")
			this.N = window.progressSlider.getValue();
		else
			this.N = window.sliders[this.suffix].getValue();
		//if (!this.N) this.N = 1;
        this.M = convertToBytes(`#${prefix}-select-M`, document.querySelector(`#${prefix}-input-M`).value);
        this.f = document.querySelector(`#${prefix}-input-f`).value;
        this.P = convertToBytes(`#${prefix}-select-P`, document.querySelector(`#${prefix}-input-P`).value);
        this.Mbf = convertToBytes(`#${prefix}-select-Mbf`, document.querySelector(`#${prefix}-input-Mbf`).value);
        this.s = parseFloat(document.querySelector(`#${prefix}-input-s`).value);
        this.mu = document.querySelector(`#${prefix}-input-mu`).value;
        this.phi = document.querySelector(`#${prefix}-input-phi`).value;
        this.PB = this.P * this.B;
        this.L = this._getL();

        if (prefix === "cmp") {
            var percentage = document.querySelector(`#${prefix}-input-s`).value + "%";
            document.querySelector("#metric-lQ-title").textContent = "(L) range lookup ("+ percentage + ")";
            var str = `Long range lookup cost: the average worst-case I/O cost performed by range lookups with ${percentage} unique keys of the entire key space and mostly target the largest level.`;
            document.querySelector("#metric-lQ-title").setAttribute("data-original-title", str);
        } else {
            document.querySelector("#metric-lQ-title").textContent = "(L) range lookup";
        }

        this._prepareCumulative();

    }
    showBush() {
        var btn_list = [];
        var parent = document.querySelector(`#${this.suffix}-bush`);
        if (this.MP) btn_list = this._getBtnGroups(parent, this.L, this.T);
        else btn_list = this._getBtns(parent, this.L, this.T);
        clear(parent);

		var createGlowBulb = function() {
			var lightbulb_icon = document.createElement("img");
			lightbulb_icon.src = "img/bulb_glow.png";
			lightbulb_icon.style.width = "24px";
			lightbulb_icon.style.height = "24px";
			lightbulb_icon.classList.add("blinker");
			return lightbulb_icon;
		}

		var createDarkBulb = function() {
			var lightbulb_icon = document.createElement("span");
			lightbulb_icon.classList.add("material-icons-outlined");
			lightbulb_icon.classList.add("md-18");
			lightbulb_icon.innerHTML = "lightbulb";
			return lightbulb_icon;
		}

		var blinkFunc = function() {
			if (document.querySelectorAll("img.blinker")) document.querySelectorAll("img.blinker").forEach(function(item){
				item.src = "img/bulb_dark.png";
			});
		}


		const lsmtType = this.constructor.name;
		switch (lsmtType) {
			case "VanillaLSM":
				//console.log("vanilla lsm");
				var labeler = -1;
        		for (var i = 1; i <= this.L; i++) {
					var div_wrap = document.createElement("div");
            		div_wrap.setAttribute("class", `row ${this.suffix}-result`);
					//var button_wrapper = document.createElement("div");
					//button_wrapper.appendChild(btn_list[i]);
            		div_wrap.appendChild(btn_list[i]);
					/*var lightbulb_icon = document.createElement("span");
					lightbulb_icon.classList.add("material-icons-outlined");
					lightbulb_icon.classList.add("md-18");
					lightbulb_icon.innerHTML = "lightbulb";*/
					/*var lightbulb_icon = document.createElement("img");
					lightbulb_icon.src = "img/bulb_glow.png";
					lightbulb_icon.style.width = "24px";
					lightbulb_icon.style.height = "24px";*/
					//const lightbulb_icon = createDarkBulb();
					//div_wrap.appendChild(lightbulb_icon);
					if (i == 1) {
						div_wrap.appendChild(createGlowBulb());
						if (btn_list[i].entryNum == 0) labeler = 0;
					} else if (labeler == 0 && btn_list[i].entryNum == 0) {
						div_wrap.appendChild(createGlowBulb());
						this.NCompaction ++;
					} else {
						if (labeler == 0) {
							div_wrap.appendChild(createGlowBulb());
							this.NCompaction ++;
						}
						else
							div_wrap.appendChild(createDarkBulb());
						labeler = 1;
						//div_wrap.appendChild(createDarkBulb());
					}
            		parent.appendChild(div_wrap);
        		}
				break;
			case "RocksDBLSM":
				//console.log("rocksdb lsm");
				for (var i = 1; i <= this.L; i++) {
					var div_wrap = document.createElement("div")
					div_wrap.setAttribute("class", `row ${this.sufix}-result`);
					div_wrap.appendChild(btn_list[i]);
					if (i == 1 || (i > 1 && btn_list[i - 1].compaction)) {
						div_wrap.appendChild(createGlowBulb());
						this.NCompaction ++;
					} else {
						div_wrap.appendChild(createDarkBulb());
					}
					parent.appendChild(div_wrap);
				}
				break;
			case "DostoevskyLSM":
				//console.log("dostoevsky lsm");
				var labeler = -1;
				for (var i = 1; i <= this.L; i++) {
					var div_wrap = document.createElement("div");
					div_wrap.setAttribute("class", `row ${this.sufix}-result`);
					div_wrap.appendChild(btn_list[i]);
					if (i == 1) {
						div_wrap.appendChild(createGlowBulb());
						if (btn_list[i].empty) labeler = 0;
					} else if (labeler == 0 && btn_list[i].empty) {
						div_wrap.appendChild(createGlowBulb());
						this.NCompaction ++;
					} else {
						if (labeler == 0) {
							div_wrap.appendChild(createGlowBulb());
							this.NCompaction ++;
						}
						else
							div_wrap.appendChild(createDarkBulb());
						labeler = 1;
						//div_wrap.appendChild(createDarkBulb());
					}
					parent.appendChild(div_wrap);
				}
				break;
			case "OSM":
				//console.log("osm");
				for (var i = 1; i <= this.L; i++) {
          var div_wrap = document.createElement("div");
					div_wrap.setAttribute("class", `row ${this.sufix}-result`);
					div_wrap.appendChild(btn_list[i]);
					if (i == 1) {
						div_wrap.appendChild(createGlowBulb());
						if (btn_list[i].empty) labeler = 0;
					} else if (labeler == 0 && btn_list[i].empty) {
						div_wrap.appendChild(createGlowBulb());
						this.NCompaction ++;
					} else {
						if (labeler == 0) {
							div_wrap.appendChild(createGlowBulb());
							this.NCompaction ++;
						}
						else
							div_wrap.appendChild(createDarkBulb());
						labeler = 1;
						//div_wrap.appendChild(createDarkBulb());
					}
					parent.appendChild(div_wrap);
				}
				break;
			default:
				for (var i = 1; i <= this.L; i++) {
					var div_wrap = document.createElement("div");
					div_wrap.setAttribute("class", `row ${this.sufix}-result`);
					div_wrap.appendChild(btn_list[i]);
          if (i == 1) {
						div_wrap.appendChild(createGlowBulb());
						if (btn_list[i].empty) labeler = 0;
					} else if (labeler == 0 && btn_list[i].empty) {
						div_wrap.appendChild(createGlowBulb());
						this.NCompaction ++;
					} else {
						if (labeler == 0) {
							div_wrap.appendChild(createGlowBulb());
							this.NCompaction ++;
						}
						else
							div_wrap.appendChild(createDarkBulb());
						labeler = 1;
						//div_wrap.appendChild(createDarkBulb());
					}
					parent.appendChild(div_wrap);
				}
		}

		/*for (var i = 1; i <= this.L; i++) {
			var div_wrap = document.createElement("div");
			div_wrap.setAttribute("class", `row ${this.suffix}-result`);
			//var button_wrapper = document.createElement("div");
			//button_wrapper.appendChild(btn_list[i]);
			div_wrap.appendChild(btn_list[i]);
			var lightbulb_icon = document.createElement("span");
			lightbulb_icon.classList.add("material-icons-outlined");
			lightbulb_icon.classList.add("md-18");
			lightbulb_icon.innerHTML = "lightbulb";
			var lightbulb_icon = document.createElement("img");
			lightbulb_icon.src = "img/bulb_glow.png";
			lightbulb_icon.style.width = "24px";
			lightbulb_icon.style.height = "24px";
			//const lightbulb_icon = createDarkBulb();
			div_wrap.appendChild(lightbulb_icon);
			if (i == 1 && btn_list[i].entryNum == 0) {
				div_wrap.appendChild(createGlowBulb());
				labeler = 0;
			} else if (labeler ==0 && btn_list[i].entryNum == 0) {
				div_wrap.appendChild(createGlowBulb());
			} else {
				labeler = 1;
				div_wrap.appendChild(createDarkBulb());
			}
			parent.appendChild(div_wrap);
		}*/
		const blinkingId = setTimeout(blinkFunc, 300);
		window.blinkingId = blinkingId;
    }

    formatBytes(bytes,decimals) {
      if(bytes == 0) return '0 Byte';
	     if(bytes < 1) return (bytes*8).toFixed(4) + ' ' + 'bits';
       var k = 1024; // or 1024 for binary
       var dm = decimals + 1 || 3;
       var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', '(*1024) YB'];
       var i = Math.floor(Math.log(bytes) / Math.log(k));
       return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    showCost() {
        /*document.querySelector(`#${this.suffix}-W-cost`).textContent = roundTo(this._getUpdateCost(), 4) + " I/O";
        document.querySelector(`#${this.suffix}-R-cost`).textContent = roundTo(this._getZeroPointLookUpCost(), 4) +" I/O";
        document.querySelector(`#${this.suffix}-V-cost`).textContent = roundTo(this._getExistPointLookUpCost(), 4) +" I/O";
        document.querySelector(`#${this.suffix}-sQ-cost`).textContent = roundTo(this._getShortRangeLookUpCost(), 4) +" I/O";
        document.querySelector(`#${this.suffix}-lQ-cost`).textContent = roundTo(this._getLongRangeLookUpCost(), 4) +" I/O";
        document.querySelector(`#${this.suffix}-sAMP-cost`).textContent = roundTo(this._getSpaceAmpCost(), 4);*/
		document.querySelector(`#${this.suffix}-W-cost`).textContent = this.L;
		document.querySelector(`#${this.suffix}-N-run`).textContent = this._getNumSortedRun();
		this.NSortedRun = 0;
		document.querySelector(`#${this.suffix}-N-compaction`).textContent = this._getNumCompaction();
		this.NCompaction = 0;
        document.querySelector(`#${this.suffix}-ZR-cost`).textContent = roundTo(this._getZeroPointLookUpCost(), 2) +" I/O";
        document.querySelector(`#${this.suffix}-NZR-cost`).textContent = roundTo(this._getExistPointLookUpCost(), 2) +" I/O";
        document.querySelector(`#${this.suffix}-sQ-cost`).textContent = roundTo(this._getShortRangeLookUpCost(), 2) +" I/O";
        document.querySelector(`#${this.suffix}-lQ-cost`).textContent = this._getLongRangeLookUpCost().toExponential(1) +" I/O";
        document.querySelector(`#${this.suffix}-sAMP-cost`).textContent = roundTo(this._getSpaceAmpCost(), 2);
        document.querySelector(`#${this.suffix}-ingestion-cost`).textContent = roundTo(this._getUpdateCost(), 2) + " I/O";
        document.querySelector(`#${this.suffix}-compaction-size`).textContent = this.formatBytes(this._getAvgCompSize(), 1);
        document.querySelector(`#${this.suffix}-compaction-latency`).textContent = roundTo(this._getAvgCompLat(),2) + " s";
        document.querySelector(`#${this.suffix}-tail-latency`).textContent = roundTo(this._getTailCompLat(), 2) + " s";
        document.querySelector(`#${this.suffix}-storage-cost`).textContent = this.formatBytes(this._getWorstCaseStorageSpace(), 1);
        document.querySelector(`#${this.suffix}-mem-cost`).textContent = this.formatBytes(this._getMemoryFootprint(), 1);
    }

    updatePlotData() {
      for(let i = 0; i < plotted_metrics.length; i++){
        traces_for_plots[plotted_metrics[i]][this.plotIdx].x = [];
        traces_for_plots[plotted_metrics[i]][this.plotIdx].y = [];
      }


      var t = 0;
      var lvl_idx = 0;
      var t_idx = 0;
      var tmp_array = [];
      var tmp_value = 0;
      while(t*this.F <= this.N){
        traces_for_plots[plotted_metrics[0]][this.plotIdx].x.push(t*this.F);

        // update data for plots
        traces_for_plots[plotted_metrics[1]][this.plotIdx].y.push(this._getNumSortedRun(t*this.F));
        traces_for_plots[plotted_metrics[2]][this.plotIdx].y.push(this._getNumCompaction(t*this.F));
        traces_for_plots[plotted_metrics[3]][this.plotIdx].y.push(this._getAvgCompSize(t*this.F)/1024/1024);
        traces_for_plots[plotted_metrics[4]][this.plotIdx].y.push(this._getAvgCompLat(t*this.F));
        traces_for_plots[plotted_metrics[5]][this.plotIdx].y.push(this._getUpdateCost(t*this.F));
        traces_for_plots[plotted_metrics[6]][this.plotIdx].y.push(this._getZeroPointLookUpCost(t*this.F));
        traces_for_plots[plotted_metrics[7]][this.plotIdx].y.push(this._getExistPointLookUpCost(t*this.F));
        traces_for_plots[plotted_metrics[8]][this.plotIdx].y.push(this._getShortRangeLookUpCost(t*this.F));
        traces_for_plots[plotted_metrics[9]][this.plotIdx].y.push(this._getLongRangeLookUpCost(t*this.F));
        traces_for_plots[plotted_metrics[10]][this.plotIdx].y.push(this._getSpaceAmpCost(t*this.F));
        traces_for_plots[plotted_metrics[11]][this.plotIdx].y.push(this._getWorstCaseStorageSpace(t*this.F)/1024/1024);
        traces_for_plots[plotted_metrics[0]][this.plotIdx].y.push(lvl_idx);
        t++;
        // update data for level plots
        if(t*this.F > this.cumulativeLevelThreshold[lvl_idx]){
          lvl_idx++;
        }
      }

      for(let i = 1; i < plotted_metrics.length; i++){
        traces_for_plots[plotted_metrics[i]][this.plotIdx].x = traces_for_plots[plotted_metrics[0]][this.plotIdx].x;
      }

    }

    show() {
        this.showBush();
        this.showCost();
        this.updatePlotData();
    }

    _getUpdateCost(entryNum = this.N) {
        // W
        // var f1 = this.phi/(this.mu*this.B);
        // var f2;
        // if(this.L > this.X){
        //    f2 = (this.T-1)/this.K * this.X + (this.L - this.X)*(this.T-1)/(this.Z+1);
        // }else{
        //   f2 = (this.T-1)/this.K * (this.X - 1) + (this.T-1)/this.Z
        // }
        // return f1*f2;
        return this.cumulativeData[Math.floor(entryNum / this.F)].avgIngestCost;

    }
    _getZeroPointLookUpCost(entryNum = this.N) {
        //R
        var f1 = Math.exp(-(this.Mbf/this.NTotal)*Math.pow(Math.log(2), 2));
        // var k = this.K;
        // var z = this.Z;
        // if(this.K == this.T){
        //   k = this.K - 1;
        // }
        // if(this.Z == this.T){
        //   z = this.Z - 1;
        // }
        // var f2 = this.X*k + (this.L - this.X)*z;
        // if(this.L <= this.X){
        //   f2 = (this.X - 1)*k + z;
        // }
        // return f1*f2;
        var num = Math.ceil(entryNum / this.F);
        var tmp_array = this.cumulativeData[num].runsPerLevel;
        var tmp_value = 0;
        for(let i = 0; i < tmp_array.length; i++){
          tmp_value += tmp_array[i]*f1;
        }
        return tmp_value;
    }
    _getExistPointLookUpCost(entryNum = this.N)  {
        //V = 1 + R - R/Z * (T-1)/T
        //var R = this._getZeroPointLookUpCost();
        if(entryNum == 0) return 0;
        var f1 = Math.exp(-(this.Mbf/this.NTotal)*Math.pow(Math.log(2), 2));
        var num = Math.ceil(entryNum / this.F);
        var tmp_array = this.cumulativeData[num].runsPerLevel;
        var tmp_value = 0;
        for(let i = 0; i < tmp_array.length - 1; i++){
          tmp_value += tmp_array[i]*f1;
        }
        if(tmp_array[tmp_array.length - 1] == 1){
          return tmp_value + 1;
        }else{
          return tmp_value + (tmp_array[tmp_array.length - 1] - 1)/2*f1 + 1;
        }
    }
    _getShortRangeLookUpCost(entryNum = this.N){
        //sQ
        // if(this.L <= this.X){
        //   return 2*(this.K*(this.L-1) + this.Z);
        // }else{
        //   return 2*(this.K*this.X + (this.L - this.X)*this.Z);
        // }
        if(entryNum == 0) return 0;

        var num = Math.ceil(entryNum / this.F);
        var tmp_array = this.cumulativeData[num].runsPerLevel;
        var tmp_value = 0;
        for(let i = 0; i < tmp_array.length ; i++){
          tmp_value += tmp_array[i]*2;
        }
        return tmp_value;
    }
    _getLongRangeLookUpCost(entryNum = this.N){
        //lQ
        //uncertain
        // var f1 = this._getShortRangeLookUpCost();
        // var f2 = (this.Z + this.K/this.T);
        // return (1/this.mu) * (this.s/this.B) *(f1 + f2);
        if(entryNum == 0) return 0;

        var num = Math.ceil(entryNum / this.F);
        var tmp_array = this.cumulativeData[num].runsPerLevel;
        var tmp_array2 = this.cumulativeData[num].entriesPerLevel;
        var tmp_value = 0;
        for(let i = 0; i < tmp_array.length && i < tmp_array2.length; i++){
          tmp_value += tmp_array[i]*2 + (this.s/this.N)*tmp_array2[i]*this.F*this.E/this._P;
        }
        return tmp_value;
    }
    _getSpaceAmpCost(entryNum = this.N) {
        //sAMP
    //   var f1 = (this.Z - 1)/(this.T - 1)*(1 - Math.pow(1.0/this.T, this.L - 1 - this.X));
    //   var f2 = (this.K - 1)/(this.T - 1)* (Math.pow(1.0/this.T, this.L - 1 - this.X) -  Math.pow(1.0/this.T, this.L - 1));
		// return this.Z - 1 + f1*f2;
      if(entryNum == 0) return 0;

      var num = Math.ceil(entryNum / this.F);
      var tmp_array = this.cumulativeData[num].runsPerLevel;
      var tmp_array2 = this.cumulativeData[num].entriesPerLevel;
      var size_of_largest_run = tmp_array2[tmp_array2.length - 1]/tmp_array[tmp_array.length - 1];
      for(var i = 0; i < tmp_array2.length - 1; i++){
        if(size_of_largest_run < tmp_array2[i]/tmp_array[i]){
          size_of_largest_run = tmp_array2[i]/tmp_array[i];
        }
      }
      return entryNum/(size_of_largest_run*this.F) - 1;
    }
	_getNumSortedRun(entryNum = this.N) {
    if(entryNum == 0) return 0;
    var num = Math.ceil(entryNum / this.F);
    var tmp_array = this.cumulativeData[num].runsPerLevel;
    var tmp_value = 0;
    for(let i = 0; i < tmp_array.length; i++){
      tmp_value += tmp_array[i];
    }
    return tmp_value;
	}

	_getNumCompaction(entryNum = this.N) {
		return this.cumulativeData[Math.floor(entryNum / this.F)].numComp;
	}

	_getMovedData() {
		return this._getReadData()  + this._getWriteData() * this.phi;
	}

	_calculateReadData() {
		var num = Math.floor(this.N / this.F);
		//var nLevels = this.L;
		var sum = 0;
		var arr = new Array(this._getL() + 1);
		for (var i = this._getL(); i >= 1; i --) {
			arr[i] = Math.floor(num / Math.pow(this.T, i - 1));
			num = num - arr[i] * Math.pow(this.T, i - 1);
		}
		if (arr[1] == 0) {
			sum += this.T - 1;
			var j = 2;
			while (j < this._getL() && arr[j] == 0) {
				sum +=  Math.pow(this.T, j - 1);
				j ++;
			}
		} else {
			sum += arr[1] - 1;
		}

		//console.log("read: ", sum)
		return sum;
	}

	_calculateWriteData() {
		var num = Math.floor(this.N / this.F);
		//var nLevels = this.L;
		var sum = 0;
		//console.log("L=",this.L);
		var arr = new Array(this._getL() + 1);
		for (var i = this._getL(); i >= 1; i --) {
			arr[i] = Math.floor(num / Math.pow(this.T, i - 1));
			num = num - arr[i] * Math.pow(this.T, i - 1);
		}
		//console.log(arr);
		if (arr[1] == 0) {
			sum += this.T;
			var j = 2;
			while (j < this._getL() && arr[j] == 0) {
				sum +=  Math.pow(this.T, j - 1);
				j ++;
			}
		} else {
			sum += arr[1];
		}
		//console.log("write: ",sum);

		return sum;
	}

	_calculateMovedData() {
		//console.log("moved data: ", this._calculateReadData() + this._calculateWriteData());
		return this._calculateReadData()/(1024.0*1024.0*this.mu) + this._calculateWriteData()/ (1024.0*1024.0*this.phi);
	}

	_getAvgCompSize(entryNum = this.N) {
		//console.log("n / f", this.N/this.F);
		//console.log("size", this.cumulativeMeta.size);
    if(entryNum == 0) return 0;
    var meta = this.cumulativeData[Math.floor(correctDecimal(entryNum/this.F))];
		if (!meta.numComp) return 0;
		return meta.totalCompSize*this.F*this.E / meta.numComp;
	}

	_calculateTotalCompSize() {
		this.cumulativeMeta.totalSize += this._calculateWriteData();
		return this.cumulativeMeta.totalSize;
	}

	_getAvgCompLat(entryNum = this.N) {
    if(entryNum == 0) return 0;
    var meta = this.cumulativeData[Math.floor(correctDecimal(entryNum/this.F))];
		if (!meta.numComp) return 0;
		return meta.totalCompLat / meta.numComp;
  }

	_calculateTotalCompLat() {
		this.cumulativeMeta.totalCompLat += this._calculateMovedData();
		return this.cumulativeMeta.totalCompLat;
	}

	_getTailCompLat() {
    if(this.N == 0) return 0;
		return this.cumulativeData[Math.floor(correctDecimal(this.N / this.F))].maxLat;
	}

	_calculateTailCompLat() {
		if (this._calculateMovedData() > this.cumulativeMeta.maxLat) this.cumulativeMeta.maxLat  = this._calculateMovedData();
		//console.log("maxlat: ", this.cumulativeMeta.maxLat)
		return this.cumulativeMeta.maxLat;
	}

	_getWorstCaseStorageSpace(entryNum = this.N) {
    if(entryNum == 0) return 0;

    var num = Math.ceil(entryNum / this.F);
    var tmp_array = this.cumulativeData[num].runsPerLevel;
    var tmp_array2 = this.cumulativeData[num].entriesPerLevel;
    var tmp_value = 0;
    for(let i = 0; i < tmp_array.length && i < tmp_array2.length; i++){
      tmp_value += tmp_array2[i]*this.F*this.E + tmp_array2[i]*this.F/(Math.floor(this.P/this.E))*(this.KEY_SIZE + 8);
    }
    return tmp_value + this.Mbf;
		//return entryNum * this.E * (1 + this._getSpaceAmpCost(entryNum));
	}

	_getMemoryFootprint() {
		var f1 = (this.Mbf/this.NTotal) * this.N / 8;
		var f2 = this.N * (this.KEY_SIZE + 8) / this._P;
		var f3 = 2 * this.P * this.B * this.E;
		return f1 + f2 + f3;
	}

	_prepareCumulative() {

    this.cumulativeLevelThreshold = [0];
    var lsm = new LSM_tree(0);
    lsm.K = this.K;
    lsm.Z = this.Z;
    lsm.X = this.X;
    lsm.T = this.T;
    lsm.F = this.F;
    lsm.mu = this.mu;
    lsm.phi = this.phi;
    lsm.partial_compact = (this.name == "RocksDBLSM");


    if(this.name != "RocksDBLSM"){
      var max_L = this._getL(this.NTotal - this.NTotal%this.PB);
      for(let i = 1; i < max_L; i++){
        this.cumulativeLevelThreshold.push(Math.pow(this.T, i)*this.PB);
      }
    }else{
      var fileNum = Math.ceil(this.NTotal / this.F);
      lsm.bg_compact = this.bg_merge;
      lsm.bg_threshold = this.threshold;
      var i = 0;
      var L = 0;
      while (i < fileNum) {
          L += 1;
          i += this._getLevelCapacityByFile(L);
          this.cumulativeLevelThreshold.push(i*this.F);

      }
    }


    var cmpct_meta = {num_compaction:0,max_io_cmpct:0,summed_read_cmpct:0,summed_write_cmpct:0};
    var last_cumulativeData = {totalCompSize:0, numComp:0,totalCompLat:0, maxLat:0};

			var t = 0;
			this.cumulativeData = [];
			this._clearCumulativeMeta();
			while (t * this.F <= this.NTotal) {
				// this.cumulativeData[s] = {totalCompSize: this._calculateTotalCompSize(),
				// 	 						totalCompLat: this._calculateTotalCompLat(),
				// 							maxLat: this._calculateTailCompLat(),
				// 							numComp: this._calculateNumCompaction(),
        //               runsPerLevel: lsm.getRunsPerLvl(),
        //             };
        this.cumulativeData[t] = {totalCompSize: last_cumulativeData.totalCompSize + cmpct_meta.summed_read_cmpct + cmpct_meta.summed_write_cmpct,
            					totalCompLat: last_cumulativeData.totalCompLat + (cmpct_meta.summed_read_cmpct/this.mu + cmpct_meta.summed_write_cmpct/this.phi)*this.F*this.E/1024/1024,
            					maxLat: Math.max(last_cumulativeData.maxLat, cmpct_meta.max_io_cmpct*this.F*this.E/1024/1024),
            					numComp: last_cumulativeData.numComp + cmpct_meta.num_compaction,
                      runsPerLevel: lsm.getRunsPerLvl(),
                      entriesPerLevel: JSON.parse(JSON.stringify(lsm.getEntriesPerLvl()))
        };
        if(t != 0){
          this.cumulativeData[t].avgIngestCost = this.E/this._P + this.cumulativeData[t].totalCompSize*this.E/this._P/t;
        }else{
          this.cumulativeData[t].avgIngestCost = 0;
        }

        last_cumulativeData = this.cumulativeData[t];
				//console.log(s, "s", this.cumulativeData[s]);
				t ++;
        cmpct_meta = lsm.flush_one_buffer();


			}

      this.cumulativeData[t] = {totalCompSize: last_cumulativeData.totalCompSize + cmpct_meta.summed_read_cmpct + cmpct_meta.summed_write_cmpct,
                    totalCompLat: last_cumulativeData.totalCompLat + (cmpct_meta.summed_read_cmpct/this.mu + cmpct_meta.summed_write_cmpct/this.phi)*this.F*this.E/1024/1024,
                    maxLat: Math.max(last_cumulativeData.maxLat, cmpct_meta.max_io_cmpct*this.F*this.E/1024/1024),
                    numComp: last_cumulativeData.numComp + cmpct_meta.num_compaction,
                    runsPerLevel: lsm.getRunsPerLvl(),
                    entriesPerLevel: JSON.parse(JSON.stringify(lsm.getEntriesPerLvl()))
      };
			this.cumulativeMeta.ratio = this.T;
			this.cumulativeMeta.size = this.cumulativeData.length;

    for(var member in lsm){
      delete lsm[member];
    }
	}

	_calculateNumCompaction() {
		this.cumulativeMeta.numComp += 0;
		return this.cumulativeMeta.numComp;
	}

	_clearCumulativeMeta() {
		this.cumulativeMeta.totalCompLat = 0;
		this.cumulativeMeta.totalCompSize = 0;
		this.cumulativeMeta.maxLat = 0;
		this.cumulativeMeta.size = 0;
		this.cumulativeMeta.ratio = 0;
		this.cumulativeMeta.numComp = 0;
	}

}


class VanillaLSM extends LSM{
    constructor(tarConf, tarRes) {
        super(tarConf, tarRes);
        this.plotIdx = 0;
    }

    _getEntryNum(offset, run_cap, jth) {
        if(this.MP) {
            for (var j = 0; j < this.T - 1; j++) {
                if ((j + 1) * run_cap >= offset) break;
            }
            if (jth > j) return 0;
            else if (jth < j) return run_cap;
            else return offset - jth * run_cap;
        } else {     // not reaching the last level
            return offset;
        }
    }
    /* Detect whether current level should be filled up
     * lth > 1
     * Return True, fill with current level capacity
     * Return False, fill with x times previous level capacity
     */
    _isFull(n, lth) {
        return n >= super._getLevelCapacity(lth);
    }
    _getOffsetFactor(n, lth) {  //lth > 1
        var offset = n - super._sumLevelCapacity(lth - 1);
        var prev_capacity = super._sumLevelCapacity(lth - 1) + this.PB;
        for (var i = 1; i <= this.T - 1; i++) {
            if (offset <= i * prev_capacity) {
                break;
            }
        }
        return i;
    }

    _renderLeveler(elem, n) {
        n = (n < 0) ? 0 : n;
        var l = this._getL(n);
        var level_cap = super._getLevelCapacity(l);
        var level_space = super._getLevelSpace(l);
        var context = "";
        var rate = 0;
        var entry_num = 0;
        if (l == 1) {
            // set n on l1
            entry_num = this._getEntryNum(n + super._getExtraEntries(), level_cap);
            rate = entry_num / level_space;
            var file_num = Math.floor(correctDecimal(entry_num / this.F));
			//console.log("render level cap:", level_space);
            context = super._getTipText(l, level_space, entry_num, file_num);
            setToolTip(elem[l], "left", context);
            //setRunGradient(elem[l], rate, file_num, Math.min(level_cap, level_physical_capacities[8 - l]));
			//var file_num = Math.ceil(entry_num / this.PB);
			setRunGradientWrapper(elem[l], file_num, Math.ceil(level_space / this.F), elem[l].displayunit);
			elem[l].entryNum = file_num;
			if (file_num != 0) this.NSortedRun ++;
            return;
        }

		var file_num = 0;
        if (this._isFull(n, l)) {
            entry_num = level_cap;
            rate = entry_num / level_space;
            file_num = Math.ceil(correctDecimal(entry_num / this.F));
			if (file_num != 0) this.NSortedRun ++;
			//console.log("render level cap:", level_space);
            context = super._getTipText(l, level_space, entry_num, file_num);
            n = n - entry_num;
        } else {
            entry_num = this._getOffsetFactor(n, l) * (super._sumLevelCapacity(l - 1) + this.PB);
            rate = entry_num / level_space;
			//console.log("render level cap:", level_space);
            file_num = Math.ceil(correctDecimal(entry_num / this.F));
			if (file_num != 0) this.NSortedRun ++;
            context = super._getTipText(l, level_space, entry_num, file_num);
            n = n - entry_num;
        }
        setToolTip(elem[l], "left", context);
        //setRunGradient(elem[l].element, rate, file_num);
		setRunGradientWrapper(elem[l], file_num, level_space, elem[l].displayunit );
		elem[l].entryNum = file_num;
        return this._renderLeveler(elem, n);
    }

    _renderTier(elem, n, max_runs) {
        n = (n < 0) ? 0 : n;
        var l = this._getL(n);
        var level_cap = super._getLevelCapacity(l);
        var run_cap = super._getRunCapacity(l);
        var context = "";
        var rate = 0;
        var entry_num = 0;
		var entry_num_of_level = 0;
        if (l == 1) {
            // set n on l 1

            for (var j = 0; j < max_runs; j++) {
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                } else {
                    entry_num = this._getEntryNum(n + super._getExtraEntries(), run_cap, j);
					//if (entry_num > 0) this.NSortedRun ++;
                    rate = entry_num / run_cap;
                    var file_num = Math.ceil(correctDecimal(entry_num / this.F));
                    context = super._getTipText(l, run_cap, entry_num, file_num);
                    setToolTip(elem[l].childNodes[j], "left", context);
                    setRunGradient(elem[l].childNodes[j], rate);
					entry_num_of_level += entry_num;
                }
            }
			elem[l].entryNum = entry_num_of_level;
			this.NSortedRun += Math.ceil(correctDecimal(entry_num_of_level / run_cap));
			//this.NSortedRun =
            return;
        }

        if (this._isFull(n, l)) {
            entry_num = run_cap;
            rate = entry_num / run_cap;
            var file_num = Math.ceil(correctDecimal(entry_num / this.F));
            context = super._getTipText(l, run_cap, entry_num, file_num);
            for (var j = 0; j < max_runs; j++) {
                if (((max_runs >= 5) && (j === max_runs - 2)) || j === this.T - 1)  {
                } else {
                    setToolTip(elem[l].childNodes[j], "left", context);
                    setRunGradient(elem[l].childNodes[j], rate);
                }
            }
            n = n - level_cap;
			entry_num_of_level = entry_num;
        } else {
            var offset = this._getOffsetFactor(n, l) * (super._sumLevelCapacity(l - 1) + this.PB);
            for (var j = 0; j < max_runs; j++) {
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                } else {
                    entry_num = this._getEntryNum(offset, run_cap, j);
                    rate = entry_num / run_cap;
                    var file_num = Math.ceil(correctDecimal(entry_num / this.F));
                    context = super._getTipText(l, run_cap, entry_num, file_num);
                    setToolTip(elem[l].childNodes[j], "left", context);
                    setRunGradient(elem[l].childNodes[j], rate );
					entry_num_of_level += entry_num;
                }
            }
            n = n - offset;
        }
		elem[l].entryNum = entry_num_of_level;
		this.NSortedRun += Math.ceil(correctDecimal(entry_num_of_level / run_cap));
        return this._renderTier(elem, n, max_runs);
    }

    _getBtns(elem, level, ratio) {
        var runs = [];
        var run_width = 0;
        var button = null;
        var level_cap = 0;
        var context = "";

        var getWidth = function(i) {
			var ret = {width: 0, displaycap: 0, unitsize: 0};
            var coef = 1;
            var base_width = 10;
			const max_file_num = Math.pow(ratio, level);
			var max_display_cap = 0;
			if (max_file_num > 18) {
				max_display_cap = 18;
			} else {
				max_display_cap = max_file_num;
			}
            var client_width = Math.ceil(elem.clientWidth * 0.9) - 1;  // -1 to avoid stacking
			const display_cap_unit = client_width / max_display_cap;
			ret.unitsize = display_cap_unit;
			//console.log("max display cap: ",max_display_cap);

			if (max_display_cap == 18) {
				if (ratio == 2) {
					if (i == 1) {
						ret.width = display_cap_unit * 2 + "px";
						return ret;
					} else if (i == 2) {
						ret.width = display_cap_unit * 4 + "px";
						return ret;
					} else if (i > 2) {
						const coef = Math.pow(client_width / display_cap_unit / 4, 1 / (level - 2)) / ratio;
						ret.width = 4 * display_cap_unit * Math.pow(coef * ratio, i - 2) + "px";
						return ret;
					}
				} else if (ratio == 3) {
					if (i == 1) {
						ret.width = display_cap_unit * 3 + "px";
						return ret;
					} else if (i == 2) {
						const coef = Math.pow(client_width / display_cap_unit / 3, 1 / (level - 1)) / ratio;
						var width = 3 * display_cap_unit * Math.pow(coef * ratio, i - 1);
						if (width < 4 * display_cap_unit) width = 4 * display_cap_unit;
						ret.width = width + "px";
						return ret;
					} else if (i > 2) {
						var coef = Math.pow(client_width / display_cap_unit / 3, 1 / (level - 1)) / ratio;
						const width = 3 * display_cap_unit * Math.pow(coef * ratio, i - 1);
						if (width < 4 * display_cap_unit) width = 4 * display_cap_unit;
						const base_width = width;
						coef = Math.pow(client_width / base_width, 1 / (level - 2)) / ratio;
						ret.width = base_width * Math.pow(coef * ratio, i - 2) + "px";
						return ret;
					}
				} else {
					if (i == 1) {
						ret.width = display_cap_unit * 4 + "px";
						return ret;
					} else if (i > 1) {
						const coef = Math.pow(client_width / display_cap_unit / 4, 1 / (level - 1)) / ratio;
						ret.width = 4 * display_cap_unit * Math.pow(coef * ratio, i - 1) + "px";
						return ret;
					}
				}
			}
            var m = client_width / Math.pow(ratio, level);   // level0 actual width;
            if (m < base_width) {
                coef = Math.pow(client_width / base_width, 1 / level) / ratio;
                m  = base_width;
            }
			ret.width = m * Math.pow(coef * ratio, i) + "px";
			//ret.displaycap = ;
            return ret;
			/*var p_cap = 4;
			const diff = level - i;
			if (diff < 10)
				p_cap = level_physical_capacities[diff];
			return elem.clientWidth * p_cap / 64 + "px";*/
        };

        for (var i = 1; i <= level; i++) {
            const run_prop = getWidth(i);
            button = createBtn(run_prop.width);
            level_cap = super._getLevelCapacity(i);
            context = super._getTipText(i, level_cap, 0, 0);   // jth run = 0;
            setToolTip(button, "left", context);
            setRunGradient(button, 0);
            runs[i] = button;
			runs[i].displayunit = run_prop.unitsize;
			runs[i].entryNum = 0;
			//runs[i].displayunit = run_prop.unitsize;
        }
        this._renderLeveler(runs, this.N - super._getExtraEntries());
        return runs;
    }
    _getBtnGroups(elem, level, ratio) {
        // Return a list of lsm-btn-group obejcts
        var btn_groups = [];
        var max_runs = (ratio < 5) ? ratio : 5;
        var run_width = 0;
        var group_wrap = null;
        var run_cap = 0;
        var context = "";

        var getWidth = function(i) {
            if (level === 0) return elem.clientWidth + "px";
            var base_width = 10;
            var margin = (max_runs - 2) * 4 + 4;
            var l1_width = max_runs * base_width + margin;   // invariant: level1 width
            var coef = 1;
            var client_width = Math.ceil(elem.clientWidth * 0.9) - 1;  // -1 to avoid stacking
            var m = client_width / Math.pow(max_runs, level - 1);    // level1 acutal width

            if (m < l1_width) {
                coef = Math.pow(client_width / l1_width, 1 / (level - 1)) / max_runs;
                m  = l1_width;
            }
            if (i > 1) return (m * Math.pow(coef * max_runs, i - 1) - margin) / max_runs + "px";
            else return (m - margin) / max_runs + "px";
        }

        for (var i = 1; i <= level; i++) {
            run_width = getWidth(i);
            group_wrap = document.createElement("div");
            group_wrap.setAttribute("class", "lsm-btn-group");
            run_cap = super._getRunCapacity(i);

            for (var j = 0; j < max_runs; j++) {
                var child = null;
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                    child = createDots(run_width);
                    context = "This level contains " + ratio + " runs in total";
                }
                else {
                    child = createBtn(run_width);
                    context = super._getTipText(i, run_cap, 0, 0);
                    setRunGradient(child, 0);
                }
                setToolTip(child, "left", context);
                group_wrap.appendChild(child);
            }
            btn_groups[i] = group_wrap;
			btn_groups[i].entryNum = 0;
        }
        this._renderTier(btn_groups, this.N - super._getExtraEntries(), max_runs);
        return btn_groups;
    }

	_calculateNumCompaction() {
		var num = Math.floor(this.N / this.F);
		//var nLevels = this.L;
		var sum = 0;
		var arr = new Array(this._getL() + 1);
		for (var i = this._getL(); i >= 1; i --) {
			arr[i] = Math.floor(num / Math.pow(this.T, i - 1));
			num = num - arr[i] * Math.pow(this.T, i - 1);
		}
		var i = 1;
		if (this.MP == 0) {
			i = 2;
			sum = 1;
			while (i <= this._getL() && arr[i] == 0) {
				sum ++;
				i ++;
			}
		} else {
			while (i <= this._getL() && arr[i] == 0) {
				sum ++;
				i ++;
			}
		}

		//console.log("nComp ", sum);
		this.cumulativeMeta.numComp += sum;
		return this.cumulativeMeta.numComp;
	}


}

class RocksDBLSM extends LSM {
    constructor(tarConf, tarRes) {
        super(tarConf, tarRes);
        this.threshold = this._getThreshold();
        this.bg_merge = false;
        this.MP = 0;
        this.DEFAULT.MP = 0;
        this.preMP = 0;
        this.plotIdx = 1;
    }
    _getThreshold() {
        var L = this._getL();
        var lth = (L === 1) ? 1 : L - 1;
        // var t = this._getLevelCapacity(lth) / super._getLevelSpace(lth);
        var t = (this.T - 1) / this.T;
        var elem = document.querySelector(`#${this.prefix}-threshold`);
        this.slider.setValue(t * 100, true, true);
        return t;
    }
    get bg_merge() {
        return this._bg_merge;
    }
    get threshold() {
        return this._threshold / 100;
    }
    get slider() {
        if (this.prefix === "cmp") return window.cmpSlider;
        else return window.rlsmSlider;
    }
    set threshold(x) {
        this._threshold = parseFloat(x);
        return this._threshold;
    }
    set bg_merge(bool) {
        this._bg_merge = bool;
        return this._bg_merge;
    }

    _getL(fileNum = this._getFileNum()) {
        // fileNum must > 0
        if (fileNum == 0) return 1;
        var L = 0;
        var i = 0;

        while (i < fileNum) {
            L += 1;
            i += this._getLevelCapacityByFile(L);
        }
        return (L < 1) ? 1 : L;
    }
    _getLevelCapacity(ith) {
        //actual maximal capacity that can be reached PB*T - F
        var run_space = super._getLevelSpace(ith);
        if (this.N % this.F && ith === 1) {
            return run_space - this.F + this._getExtraEntries();
        }
        return run_space - this.F ;
    }
    _getLevelCapacityByFile(ith) {
        return Math.ceil(this._getLevelCapacity(ith) / this.F);
    }
    _sumLevelCapacity(levels) {
        var sum = 0;
        for (let i = 1; i <= levels; i++) {
            sum += this._getLevelCapacity(i);
        }
        return sum;
    }
    _getExtraEntries() {    //number of entries flushed to level 1 when buffer is not full
        var r = this.N  % this.PB;
        return r % this.F;
    }
    _getExtraFiles() {
        return (this.N % this.F) ? 1:0;
    }
    _getFileNum() {
        return Math.ceil(this.N / this.F);
    }
    _getEntryNum(ith, jth, run_cap) {
        var cur_cap = this._sumLevelCapacity(ith);
        var li_cap = this._getLevelCapacity(ith);
        var isLastLevel = ith === this.L;
        var offset = this.N - cur_cap + li_cap; //offset == this.N when ith == 1;
        if (this.MP) {
            if (isLastLevel) {
                for (var j = 0; j < this.T - 1; j++) {
                    if ((j + 1) * run_cap >= offset) break;
                }
                if (jth > j) return 0;
                else if (jth < j) return run_cap;
                else return offset - jth * run_cap;
            } else {
                if (jth === this.T - 1) {
                        if (ith === 1 && (this.N % this.F)) return run_cap - this.F + this._getExtraEntries();
                        else return run_cap - this.F;
                    } else {
                        return run_cap
                    }
            }
        } else {
            if (isLastLevel){
                return offset;
            } else {
                return li_cap;
            }
        }
    }
    _getBtns(elem, level, ratio) {
        var runs = [];
        var run_width = 0;
        var button = null;
        var level_cap = 0;
        var level_space = 0;
        var context = "";
        var entry_num = 0;
        var rate = 0;
        /*var getWidth = function(i) {
            var coef = 1;
            var base_width = 10;
            var client_width = elem.clientWidth - 1;  // -1 to avoid stacking
            var m = client_width / Math.pow(ratio, level);   // level0 actual width;
            if (m < base_width) {
                coef = Math.pow(client_width / base_width, 1 / level) / ratio;
                m  = base_width;
            }
            return m * Math.pow(coef * ratio, i) + "px";
        };*/
		var getWidth = function(i) {
			var ret = {width: 0, displaycap: 0, unitsize: 0};
            var coef = 1;
            var base_width = 10;
			const max_file_num = Math.pow(ratio, level);
			var max_display_cap = 0;
			if (max_file_num > 18) {
				max_display_cap = 18;
			} else {
				max_display_cap = max_file_num;
			}
            //var client_width = elem.clientWidth - 1;  // -1 to avoid stacking
            var client_width = Math.ceil(elem.clientWidth * 0.9) - 1;  // -1 to avoid stacking
			const display_cap_unit = client_width / max_display_cap;
			ret.unitsize = display_cap_unit;
			//console.log("max display cap: ",max_display_cap);

			if (max_display_cap == 18) {
				if (ratio == 2) {
					if (i == 1) {
						ret.width = display_cap_unit * 2 + "px";
						return ret;
					} else if (i == 2) {
						ret.width = display_cap_unit * 4 + "px";
						return ret;
					} else if (i > 2) {
						const coef = Math.pow(client_width / display_cap_unit / 4, 1 / (level - 2)) / ratio;
						ret.width = 4 * display_cap_unit * Math.pow(coef * ratio, i - 2) + "px";
						return ret;
					}
				} else if (ratio == 3) {
					if (i == 1) {
						ret.width = display_cap_unit * 3 + "px";
						return ret;
					} else if (i == 2) {
						const coef = Math.pow(client_width / display_cap_unit / 3, 1 / (level - 1)) / ratio;
						var width = 3 * display_cap_unit * Math.pow(coef * ratio, i - 1);
						if (width < 4 * display_cap_unit) width = 4 * display_cap_unit;
						ret.width = width + "px";
						return ret;
					} else if (i > 2) {
						var coef = Math.pow(client_width / display_cap_unit / 3, 1 / (level - 1)) / ratio;
						const width = 3 * display_cap_unit * Math.pow(coef * ratio, i - 1);
						if (width < 4 * display_cap_unit) width = 4 * display_cap_unit;
						const base_width = width;
						coef = Math.pow(client_width / base_width, 1 / (level - 2)) / ratio;
						ret.width = base_width * Math.pow(coef * ratio, i - 2) + "px";
						return ret;
					}
				} else {
					if (i == 1) {
						ret.width = display_cap_unit * 4 + "px";
						return ret;
					} else if (i > 1) {
						const coef = Math.pow(client_width / display_cap_unit / 4, 1 / (level - 1)) / ratio;
						ret.width = 4 * display_cap_unit * Math.pow(coef * ratio, i - 1) + "px";
						return ret;
					}
				}
			}
            var m = client_width / Math.pow(ratio, level);   // level0 actual width;
            if (m < base_width) {
                coef = Math.pow(client_width / base_width, 1 / level) / ratio;
                m  = base_width;
            }
			ret.width = m * Math.pow(coef * ratio, i) + "px";
			//ret.displaycap = ;
            return ret;
			/*var p_cap = 4;
			const diff = level - i;
			if (diff < 10)
				p_cap = level_physical_capacities[diff];
			return elem.clientWidth * p_cap / 64 + "px";*/
        };


        for (var i = 1; i <= level; i++) {
            run_width = getWidth(i).width;
            button = createBtn(run_width);
            level_cap = this._getLevelCapacity(i);
            level_space = this._getLevelSpace(i);
            entry_num = this._getEntryNum(i, 0, level_cap);
            rate = entry_num / level_space;
            var file_num = Math.floor(correctDecimal(entry_num / this.F));
            context = super._getTipText(i, level_space, entry_num, file_num);
            setToolTip(button, "left", context);
            //setRunGradient(button, rate, file_num);
			setRunGradientWrapper(button, file_num, Math.ceil(level_space / this.F), getWidth(i).unitsize);
            runs[i] = button;
			if (file_num == Math.ceil(level_space/this.F) - 1 && i < level) {
				runs[i].compaction = true;
			} else {
				runs[i].compaction = false;
			}
        }
        return runs;
    }

    // Background merging
    _getLevelCapacityALT(ith) {
        return this._getLevelCapacityByFileALT(ith) * this.F;
    }
    _getLevelCapacityByFileALT(ith) {
        if (ith === this.L) return this._getLevelSpaceByFileALT(ith);
        else return Math.floor(this.threshold * this._getLevelSpaceByFileALT(ith));
    }
    _getLevelSpaceByFileALT(ith) {
        return Math.ceil(super._getLevelSpace(ith) / this.F);
    }
    _sumLevelCapacityALT(levels) {
        var sum = 0;
        for (let i = 1; i <= levels; i++) {
            sum += this._getLevelCapacityALT(i);
        }
        return sum;
    }
    _sumLevelCapacityByFileALT(levels) {
        var sum = 0;
        for (let i = 1; i <= levels; i++) {
            sum += this._getLevelCapacityByFileALT(i);
        }
        return sum;
    }
    _getLALT(fileNum = this._getFileNum()) {
        if (fileNum === 0) return 1;
        var L = 0;
        var cur_cap = 0;
        while (cur_cap < fileNum) {
            L += 1;
            cur_cap = this._sumLevelCapacityByFileALT(L);
        }
        return (L < 1) ? 1 : L;
    }

    _getEntryNumALT(ith, jth, run_cap) {
        var cur_cap = this._sumLevelCapacityALT(ith);
        var li_cap = this._getLevelCapacityALT(ith);
        var isLastLevel = ith === this.L;
        var offset = this.N - cur_cap + li_cap; //offset == this.N when ith == 1;
        // No tiering for rocksDB
        if (this.MP) {
            if (isLastLevel) {
                for (var j = 0; j < this.T - 1; j++) {
                    if ((j + 1) * run_cap >= offset) break;
                }
                if (jth > j) return 0;
                else if (jth < j) return run_cap;
                else return offset - jth * run_cap;
            } else {
                if (jth === this.T - 1) {
                        if (ith === 1 && (this.N % this.F)) return run_cap - this.F + this._getExtraEntries();
                        else return run_cap - this.F;
                    } else {
                        return run_cap
                    }
            }
        } else {
            if (isLastLevel){
                return offset;
            } else {
                return li_cap;
            }
        }
    }
    _getBtnsALT(elem, level, ratio) {
        var runs = [];
        var run_width = 0;
        var button = null;
        var level_cap = 0;
        var level_space = 0;
        var context = "";
        var entry_num = 0;
        var rate = 0;
        var getWidth = function(i) {
            var coef = 1;
            var base_width = 10;
            var client_width = Math.ceil(elem.clientWidth * 0.9) - 1;  // -1 to avoid stacking
            var m = client_width / Math.pow(ratio, level);   // level0 actual width;
            if (m < base_width) {
                coef = Math.pow(client_width / base_width, 1 / level) / ratio;
                m  = base_width;
            }
            return m * Math.pow(coef * ratio, i) + "px";
        };

        for (var i = 1; i <= level; i++) {
            run_width = getWidth(i);
            button = createBtn(run_width);
            level_cap = this._getLevelCapacityALT(i);
            level_space = this._getLevelSpace(i);
            entry_num = this._getEntryNumALT(i, 0, level_cap);
            rate = entry_num / level_space;
            var file_num = Math.ceil(correctDecimal(entry_num / this.F));
            context = super._getTipText(i, level_space, entry_num, file_num);
            setToolTip(button, "left", context);
            setRunGradient(button, rate);
            runs[i] = button;
        }
        return runs;
    }

    showBgMerge() {
        var btn_list = [];
        var parent = document.querySelector(`#${this.suffix}-bush`);
        if (this.MP) btn_list = this._getBtnGroupsALT(parent, this.L, this.T);
        else btn_list = this._getBtnsALT(parent, this.L, this.T);
        clear(parent);

        for (var i = 1; i <= this.L; i++) {
            var div_wrap = document.createElement("div");
            div_wrap.setAttribute("class", `row ${this.suffix}-result`);
            div_wrap.appendChild(btn_list[i]);
            parent.appendChild(div_wrap);
        }
    }
    show() {
        if (this.bg_merge) {
            this.showBgMerge();
        } else {
            this.showBush();
        }
        this.showCost();
        this.updatePlotData();
    }

    /* update current state */
    update(prefix) {
        this.prefix = prefix;
        this.T = document.querySelector(`#${prefix}-input-T`).value;
        this.E = convertToBytes(`#${prefix}-select-E`, document.querySelector(`#${prefix}-input-E`).value);
        //this.N = document.querySelector(`#${prefix}-input-N`).value;
		//this.N = window.progressSlider.getValue();
		if (window.focusedTree == "default")
			this.N = window.progressSlider.getValue();
		else
			this.N = window.sliders[this.suffix].getValue();

		//if (!this.N) this.N = 1;
        this.NTotal = document.querySelector(`#${prefix}-input-N`).value;
        this.M = convertToBytes(`#${prefix}-select-M`, document.querySelector(`#${prefix}-input-M`).value);
        this.f = document.querySelector(`#${prefix}-input-f`).value;
        this.P = convertToBytes(`#${prefix}-select-P`, document.querySelector(`#${prefix}-input-P`).value);
        this.Mbf = convertToBytes(`#${prefix}-select-Mbf`, document.querySelector(`#${prefix}-input-Mbf`).value);
        this.s = document.querySelector(`#${prefix}-input-s`).value;
        this.mu = document.querySelector(`#${prefix}-input-mu`).value;
        this.phi = document.querySelector(`#${prefix}-input-phi`).value;
        this.PB = this.P * this.B;
        this.bg_merge = (document.querySelector(`#${prefix}-bg-merging`).checked) ? true:false;
        if (this.bg_merge) {
            this.threshold = document.querySelector(`#${prefix}-threshold`).value;
            this.L = this._getLALT();
        }
        else {
            this.threshold = this._getThreshold();
            this.L = this._getL();
        }
        this._updateCostEquation();
		this._prepareCumulative();
    }

    _updateCostEquation() {
        var W = "";
        var R = "";
        var V = "";
        var sQ = "";
        var lQ = "";
        var sAMP = "";
        if (this.MP) {
            W = "$$O\\left({L \\over B} \\right)$$";
            R = "$${O\\left(e^{-{M/N}}\\cdot T^{T/(T-1)}\\right)}$$";
            V = "$${O\\left(1+e^{-{M/N}}\\cdot T^{1/(T-1)} \\cdot (T-1)\\right)}$$";
            sQ = "$$O\\left(L \\cdot T \\right)$$";
            lQ = "$$O\\left({{T \\cdot s} \\over B} \\right)$$";
            sAMP = "$$O\\left(T \\right)$$";

        } else {
            W = "$$O\\left({ L \\cdot T \\over B} \\right)$$";
            R = "$${O\\left(e^{-{M/N}}\\cdot {T^{T/(T-1)}\\over T-1}\\right)}$$";
            V = "$${O\\left(1+e^{-{M/N}}\\cdot {T^{1/(T-1)}\\over T-1}\\right)}$$";   //$${O\left(1 + e^{-{M/N}} \right)}$$
            sQ = "$$O\\left(L \\right)$$";
            lQ = "$$O\\left({s \\over B} \\right)$$";
            sAMP = "$$O\\left({1 \\over T} \\right)$$";
        }
        // document.querySelector("#rlsm-W-cost").setAttribute("title", W);
        // document.querySelector("#rlsm-R-cost").setAttribute("title", R);
        // document.querySelector("#rlsm-V-cost").setAttribute("title", V);
        // document.querySelector("#rlsm-sQ-cost").setAttribute("title", sQ);
        // document.querySelector("#rlsm-lQ-cost").setAttribute("title", lQ);
        // document.querySelector("#rlsm-sAMP-cost").setAttribute("title", sAMP);
        /*document.querySelector("#rlsm-W-cost").setAttribute("data-original-title", W);
        document.querySelector("#rlsm-ingestion-cost").setAttribute("data-original-title", R);
        document.querySelector("#rlsm-V-cost").setAttribute("data-original-title", V);
        document.querySelector("#rlsm-sQ-cost").setAttribute("data-original-title", sQ);
        document.querySelector("#rlsm-lQ-cost").setAttribute("data-original-title", lQ);
        document.querySelector("#rlsm-sAMP-cost").setAttribute("data-original-title", sAMP);*/
    }

	_calculateNumCompaction() {
		var num = Math.floor(this.N / this.F);
		var sum = 0;
		var level = 1;
		while (1) {
			if (num - Math.pow(this.T, level) + 1 < 0) break;
			sum += (Math.pow(this.T, level) - 1) * level;
			num = num - Math.pow(this.T, level) + 1;
		}
		sum += num * level;
		this.cumulativeMeta.numComp += sum;
		return this.cumulativeMeta.numComp;
	}


}

class DostoevskyLSM extends LSM {
    constructor(tarConf, tarRes) {
        super(tarConf, tarRes);
        this.MP = 1;
        this.DEFAULT.MP = 1;
        this.preMP = 1;
        this.plotIdx = 2;
    }

    _getRunCapacity(ith, level) {
        var nEntry_L = this.PB * Math.pow(this.T, ith);
        if (ith === 0 || ith === level ) return nEntry_L;
        else return nEntry_L / this.T;
    }

    _getBtnGroups(elem, level, ratio) {
        var btn_groups = [];
        var max_runs = (ratio < 5) ? ratio : 5;
        var run_width = 0;
        var group_wrap = null;
        var run_cap = 0;
        var context = "";
        var entry_num = 0;
        var rate = 0;

        var getWidth = function(i) {
            // @Customized for lazy leveling
            if (level === i ) return Math.ceil(elem.clientWidth * 0.9) + "px";    //@Custom
            var base_width = 10;
            var margin = (max_runs - 2) * 4 + 4;
            var l1_width = max_runs * base_width + margin;
            var coef = 1;
            var client_width = Math.ceil(elem.clientWidth * 0.9) - 1;
            var m = client_width / Math.pow(max_runs, level - 1);
            if (m < l1_width) {
                coef = Math.pow(client_width / l1_width, 1 / (level - 1)) / max_runs;
                m  = l1_width;
            }
            if (i > 1) return (m * Math.pow(coef * max_runs, i - 1) - margin) / max_runs + "px";
            else return (m - margin) / max_runs + "px";
        }

        for (var i = 1; i <= level; i++) {
            run_width = getWidth(i);
            group_wrap = document.createElement("div");
            run_cap = this._getRunCapacity(i, level);
            group_wrap.setAttribute("class", "lsm-btn-group");

			var non_empty_runs = 0;
            for (var j = 0; j < max_runs; j++) {
                var child = null;
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                    child = createDots(run_width);
                    var context = "This level contains " + ratio + " runs in total";
					if (this._getEntryNum(i, j, run_cap) != 0) this.NSortedRun ++;
                } else {
                    child = createBtn(run_width);
                    //entry_num = super._getEntryNum(i, j, run_cap);
					entry_num = this._getEntryNum(i, j, run_cap);
                    rate = correctDecimal(entry_num / run_cap);
                    var file_num = Math.ceil(correctDecimal(entry_num / this.F));
					if (file_num != 0) this.NSortedRun ++;
                    context = super._getTipText(i, run_cap, entry_num, file_num);
                    setRunGradient(child, rate);
                }
                setToolTip(child, "left", context);
                group_wrap.appendChild(child);
                if (i === 0 || i === level) break;  //@Custom, only one run in buffer and last level
            }
			//if (super._getEntryNum(i, 1, run_cap) == 0 && super._getEntryNum(i, run_cap - 1, run_cap) != 0) {
			//	group_wrap.compaction = true;
			//}
			if (i != level && this._getEntryNum(i, 0, run_cap) == 0) {
				group_wrap.empty = true;
			} else {
				group_wrap.empty = false;
			}
            btn_groups[i] = group_wrap;
        }
        return btn_groups;
    }

	_getEntryNum(ith, jth, run_cap) {
		var cur_cap = this._sumLevelCapacity(ith) + this._getExtraEntries();
        var li_cap = this._getLevelCapacity(ith);
        var isLastLevel = ith === this.L;
		var totalNumOfPB = Math.floor(this.N / this.PB);
		var numOfRunsInLevel = 0;
		if (ith == 1) {
			numOfRunsInLevel = (totalNumOfPB % Math.pow(this.T, ith));
		} else {
			numOfRunsInLevel = Math.floor((totalNumOfPB % Math.pow(this.T, ith)) / Math.pow(this.T, ith - 1));
		}
		if (isLastLevel) {
			return run_cap * numOfRunsInLevel / this.T;
		} else {
			if (jth < numOfRunsInLevel) {
				return run_cap;
			} else {
				return 0;
			}
		}

	}

    update(prefix) {
        this.prefix = prefix;
        this.T = document.querySelector(`#${prefix}-input-T`).value;
        this.E = convertToBytes(`#${prefix}-select-E`, document.querySelector(`#${prefix}-input-E`).value);
        //this.N = document.querySelector(`#${prefix}-input-N`).value;
		//this.N = window.progressSlider.getValue();
		if (window.focusedTree == "default")
			this.N = window.progressSlider.getValue();
		else
			this.N = window.sliders[this.suffix].getValue();

        this.NTotal = document.querySelector(`#${prefix}-input-N`).value;
        this.M = convertToBytes(`#${prefix}-select-M`, document.querySelector(`#${prefix}-input-M`).value);
        this.f = document.querySelector(`#${prefix}-input-f`).value;
        this.P = convertToBytes(`#${prefix}-select-P`, document.querySelector(`#${prefix}-input-P`).value);
        this.Mbf = convertToBytes(`#${prefix}-select-Mbf`, document.querySelector(`#${prefix}-input-Mbf`).value);
        this.s = document.querySelector(`#${prefix}-input-s`).value;
        this.mu = document.querySelector(`#${prefix}-input-mu`).value;
        this.phi = document.querySelector(`#${prefix}-input-phi`).value;
        this.PB = this.P * this.B;
        this.L = this._getL();
        if(this.L > 1)
          this.X = this.L - 1;
        else{
          this.X = 0;
        }

      this._prepareCumulative();
    }


	_calculateNumCompaction() {
		var num = Math.floor(this.N / this.F);
		//var nLevels = this.L;
		var sum = 0;
		var arr = new Array(this._getL() + 1);
		for (var i = this._getL(); i >= 1; i --) {
			arr[i] = Math.floor(num / Math.pow(this.T, i - 1));
			num = num - arr[i] * Math.pow(this.T, i - 1);
		}
		var i = 1;
		while (i <= this._getL() && arr[i] == 0) {
			sum ++;
			i ++;
		}

		//console.log("nComp ", sum);
		this.cumulativeMeta.numComp += sum;
		return this.cumulativeMeta.numComp;
	}
}

class OSM extends LSM {
    constructor(tarConf, tarRes) {
        super(tarConf, tarRes);
        this.MP = 1;
        this.DEFAULT.MP = 1;
        this.preMP = 1;
        // the number of tiered levels
        this.X = document.querySelector(`#${this.prefix}-num-tired-level-input`).value;
        this.plotIdx = 3;
    }

    _getRunCapacity(ith, level) {
        var nEntry_L = this.PB * Math.pow(this.T, ith);
        if (ith === 0 || ith > this.X ) return nEntry_L;
        else return nEntry_L / this.T;
    }

    _getBtnGroups(elem, level, ratio) {
        var btn_groups = [];
        var max_runs = (ratio < 5) ? ratio : 5;
        var run_width = 0;
        var group_wrap = null;
        var run_cap = 0;
        var context = "";
        var entry_num = 0;
        var rate = 0;

        var getWidth = function(i, X) {
            // @Customized for lazy leveling
            if (i == level ) return Math.ceil(elem.clientWidth *0.9) + "px";    //@Custom
            var base_width = 10;
            var tmp_max_runs = max_runs;
            //if(i > X) tmp_max_runs = 1;
            var margin = (tmp_max_runs - 2) * 4 + 4;
            var l1_width = tmp_max_runs * base_width + margin;
            var coef = 1;
            var client_width = Math.ceil(elem.clientWidth * 0.9) - 1;
            var m = client_width / Math.pow(tmp_max_runs, level - 1);
            if (m < l1_width) {
                coef = Math.pow(client_width / l1_width, 1 / (level - 1)) / tmp_max_runs;
                m  = l1_width;
            }
            if(i == 1){
              return (m - margin)/tmp_max_runs + "px";
            }else if(i <= X){
              return (m * Math.pow(coef * tmp_max_runs, i - 1) - margin)/ tmp_max_runs + "px";
            }else{
              return (m * Math.pow(coef * tmp_max_runs, i - 1) - margin) + "px";
            }
        }

        for (var i = 1; i <= level; i++) {
            run_width = getWidth(i, this.X);
            group_wrap = document.createElement("div");
            run_cap = this._getRunCapacity(i, level);
            group_wrap.setAttribute("class", "lsm-btn-group");

			var non_empty_runs = 0;
      var tmp_max_runs = 0;
      if(i == level || i > this.X){
        tmp_max_runs = 1;
      }else{
        tmp_max_runs = max_runs;
      }
            for (var j = 0; j < tmp_max_runs; j++) {
                var child = null;
                if ((tmp_max_runs >= 5) && (j == tmp_max_runs - 2)) {
                    child = createDots(run_width);
                    var context = "This level contains " + ratio + " runs in total";
					entry_num = this._getEntryNum(i, j, run_cap);
					if (entry_num != 0) this.NSortedRun ++;
                } else {
                    child = createBtn(run_width);
                    //entry_num = super._getEntryNum(i, j, run_cap);
					entry_num = this._getEntryNum(i, j, run_cap);
					if (entry_num != 0) this.NSortedRun ++;
                    rate = correctDecimal(entry_num / run_cap);
                    var file_num = Math.ceil(correctDecimal(entry_num / this.F));
                    context = super._getTipText(i, run_cap, entry_num, file_num);
                    setRunGradient(child, rate);
                }
                setToolTip(child, "left", context);
                group_wrap.appendChild(child);
                if (i === 0 || i > this.X) break;  //@Custom, only one run in buffer and last level
            }
			//if (super._getEntryNum(i, 1, run_cap) == 0 && super._getEntryNum(i, run_cap - 1, run_cap) != 0) {
			//	group_wrap.compaction = true;
			//}
			if (i != level && this._getEntryNum(i, 0, run_cap) == 0) {
				group_wrap.empty = true;
			} else {
				group_wrap.empty = false;
			}
            btn_groups[i] = group_wrap;
        }
        return btn_groups;
    }

	_getEntryNum(ith, jth, run_cap) {
		var cur_cap = this._sumLevelCapacity(ith) + this._getExtraEntries();
        var li_cap = this._getLevelCapacity(ith);
        var isTiredLevel = ith <= this.X && ith < this.L;
		var totalNumOfPB = Math.floor(this.N / this.PB);
		//console.log("totalNumOfPB = ", totalNumOfPB);
		var numOfRunsInLevel = 0;
		if (ith == 1) {
			numOfRunsInLevel = (totalNumOfPB % Math.pow(this.T, ith));
		} else {
			numOfRunsInLevel = Math.floor((totalNumOfPB % Math.pow(this.T, ith)) / Math.pow(this.T, ith - 1));
		}
		if (!isTiredLevel) {
			return run_cap * numOfRunsInLevel / this.T;
		} else {
			if (jth < numOfRunsInLevel) {
				return run_cap;
			} else {
				return 0;
			}
		}

	}

    update(prefix) {
      this.prefix = prefix;
      this.T = document.querySelector(`#${prefix}-input-T`).value;
      this.E = convertToBytes(`#${prefix}-select-E`, document.querySelector(`#${prefix}-input-E`).value);
        //this.N = document.querySelector(`#${prefix}-input-N`).value;
		//this.N = window.progressSlider.getValue();
		  if (window.focusedTree == "default")
			   this.N = window.progressSlider.getValue();
		  else
			   this.N = window.sliders[this.suffix].getValue();

      this.NTotal = document.querySelector(`#${prefix}-input-N`).value;
      this.M = convertToBytes(`#${prefix}-select-M`, document.querySelector(`#${prefix}-input-M`).value);
      this.f = document.querySelector(`#${prefix}-input-f`).value;
      this.P = convertToBytes(`#${prefix}-select-P`, document.querySelector(`#${prefix}-input-P`).value);
      this.Mbf = convertToBytes(`#${prefix}-select-Mbf`, document.querySelector(`#${prefix}-input-Mbf`).value);
      this.s = document.querySelector(`#${prefix}-input-s`).value;
      this.mu = document.querySelector(`#${prefix}-input-mu`).value;
      this.phi = document.querySelector(`#${prefix}-input-phi`).value;
      this.X = document.querySelector(`#${prefix}-num-tired-level-input`).value;
      this.PB = this.P * this.B;
      this.L = this._getL();
      this._prepareCumulative();
    }

	_calculateNumCompaction() {
		var num = Math.floor(this.N / this.F);
		//var nLevels = this.L;
		var sum = 0;
		var arr = new Array(this._getL() + 1);
		for (var i = this._getL(); i >= 1; i --) {
			arr[i] = Math.floor(num / Math.pow(this.T, i - 1));
			num = num - arr[i] * Math.pow(this.T, i - 1);
		}
		var i = 1;
		while (i <= this._getL() && arr[i] == 0) {
			sum ++;
			i ++;
		}

		//console.log("nComp ", sum);
		this.cumulativeMeta.numComp += sum;
		return this.cumulativeMeta.numComp;
	}
}

function initPlot(){
  for(let i = 0; i < plotted_metrics.length; i++){
    traces_for_plots[plotted_metrics[i]] = [];
    for(let j = 0; j < 4; j++){
      traces_for_plots[plotted_metrics[i]].push({
        x: [],
        y: [],
        marker: {size: 5, opacity: 0.9, symbol: 'circle', color:color_table[j%color_table.length],"line": { "width": 2, color: color_table[j%color_table.length]}},
        mode: 'lines',
        line: {color:color_table[j%color_table.length], width: 3},
        showlegend: true,
        name: name_table[j],
        hovertemplate:
            "%{y:.2f}h",
        type: 'scatter'
      })
    }
  }
}


/* Initialize the configuration and tree bush reuslt
 * when indiv-analysis being displayed
 */
function initCmp() {
    var vlsm = new VanillaLSM("cmp", "vlsm");
    var rlsm = new RocksDBLSM("cmp", "rlsm");
    var dlsm = new DostoevskyLSM("cmp", "dlsm");
    var osm = new OSM("cmp", "osm");
    window.rlsm = rlsm;     // pass to global
    window.vlsm = vlsm;
    window.dlsm = dlsm;
    window.osm = osm;
    window.obj = {rlsm:window.rlsm, vlsm:window.vlsm, dlsm:window.dlsm, osm:window.osm};
    window.vlsm.update("cmp");
    window.rlsm.update("cmp");
    window.dlsm.update("cmp");
    window.osm.update("cmp");
    window.vlsm.show();
    window.rlsm.show();
    window.dlsm.show();
    window.osm.show();
	window.focusedTree = "default";
	window.individualProgress = new Map();
	window.individualProgress["vlsm"] = 0;
	window.individualProgress["rlsm"] = 0;
	window.individualProgress["dlsm"] = 0;
	window.individualProgress["osm"] = 0;
	window.compProgress = 0;

}

/* Display one of analysis mode according to
 * it's corresponding button triggers onlick event
 */
function display() {
    switch (this.id) {
        case "customRadio1":
            hideElem("#indiv-conf-row");
            showElem("#cmp-conf-row");
            //showElem(".cmp-indiv-mp");
            ts = ["vlsm","rlsm","dlsm","osm"];
            for (var i = 0; i < 4; i++){
              $(`#cmp-${ts[i]}-title`).show();
              $(`#cmp-${ts[i]}-layout`).show();
            }
            switchContext("cmp");
            break;
        case "customRadio2":
            //hideElem(".cmp-indiv-mp");
            ts = ["vlsm","rlsm","dlsm","osm"];
            for (var i = 0; i < 4; i++){
              $(`#cmp-${ts[i]}-title`).hide();
              $(`#cmp-${ts[i]}-layout`).hide();
            }
            hideElem("#cmp-conf-row");
            showElem("#indiv-conf-row");
            switchContext("");
            break;
        default:
            //console.log(this.id);
            alert("Invalid: Unknown anlysis model selected");
    }

    function switchContext(target = "cmp") {
        if (target === "cmp") {
            // scenario1: jump to comparative analysis
            // For each, store current MP as tmpMP
            // restore preMP as current MP
            // store tmpMP as preMP
            // update("cmp") and show
            for (var key in window.obj) {
                var obj = window.obj[key];
                var tmpMP = obj.MP;
                obj.MP = obj.preMP;
                obj.preMP = tmpMP;
                obj.update("cmp");
                obj.show();
            }
        } else {    // ... update(indiv)
            for (var key in window.obj) {
                var obj = window.obj[key];
                var tmpMP = obj.MP;
                obj.MP = obj.preMP;
                obj.preMP = tmpMP;
                obj.update(key);
                obj.show();
            }
        }
    }
}

function changeProgressBar(slider, newVal) {
	slider.setValue(newVal);
	/*if (slider == window.progressSlider) {
		const maxVal = window.progressSlider.getAttribute("max");
		const newPercentage = newVal / maxVal * 100;
		console.log(newPercentage);
		document.getElementById("progress-percentage-label").innerHTML = newPercentage + "%";
		const total = document.querySelector("#adjustable-progress-bar")["aria-valuemax"];
		document.querySelector("#adjustable-progress-bar")["style"] = "width: " + newVal/total * 100 + "%";
	}*/
}

function runPlots(){
  if($("#show-plot-btn").offsetWidth <= 0 || $("#show-plot-btn").offsetHeight <= 0){
    return;
  }
  var p_width = $("#num_level_plot").width()*0.9;
  var layout={
      height:p_width,
      width:p_width,
      title: "#Levels - #keys",
      margin: {
          l: 33,
          r: 0,
          b: 30,
          t: 30,
          pad: 0
      },
      showlegend: false,
  //     legend: {
  //   x: 0,
  //   xanchor: 'left',
  //   y: 1,
  //   font: {
  //     family: 'sans-serif',
  //     size: 8,
  //     color: '#000'
  //   },
  // },
      hovermode: false,
  };

  Plotly.newPlot('num_level_plot', traces_for_plots["level"], layout, {displayModeBar: false});

  //layout.title = "#Sorted runs - #keys";
  layout.title = "#Sorted runs";
  Plotly.newPlot('num_run_plot', traces_for_plots["run"], layout, {displayModeBar: false});

  //layout.title = "#compactions - #keys";
  layout.title = "#compactions";
  Plotly.newPlot('num_cmpct_plot', traces_for_plots["num_compaction"], layout, {displayModeBar: false});

  //layout.title = "Avg Cmpct Size - #keys (MB)";
  layout.title = "Avg Cmpct Size (MB)";
  Plotly.newPlot('avg_cmpct_size_plot', traces_for_plots["avg_cmpct_size"], layout, {displayModeBar: false});

  //layout.title = "Avg Cmpct Lat. - #keys (s)";
  layout.title = "Avg Cmpct Lat. (s)";
  Plotly.newPlot('avg_cmpct_lat_plot', traces_for_plots["avg_cmpct_lat"], layout, {displayModeBar: false});

  //layout.title = "Ingest Cost - #keys (I/Os)";
  layout.title = "Ingest (I/Os)";
  Plotly.newPlot('ingest_cost_plot', traces_for_plots["ingest_cost"], layout, {displayModeBar: false});

  //layout.title = "ZR-point lookup Cost - #keys (I/Os)";
  layout.title = "ZR-point lookup (I/Os)";
  Plotly.newPlot('zr_point_lookup_plot', traces_for_plots["zr_point_lookup_cost"], layout, {displayModeBar: false});

  //layout.title = "NZR-point lookup Cost - #keys (I/Os)";
  layout.title = "NZR-point lookup (I/Os)";
  Plotly.newPlot('non_zr_point_lookup_plot', traces_for_plots["non_zr_point_lookup_cost"], layout, {displayModeBar: false});

  layout.title = "(S) range lookup (I/Os)";
  Plotly.newPlot('short_range_lookup_plot', traces_for_plots["short_range_lookup_cost"], layout, {displayModeBar: false});

  layout.title = "(L) range lookup (I/Os)";
  Plotly.newPlot('long_range_lookup_plot', traces_for_plots["long_range_lookup_cost"], layout, {displayModeBar: false});

  layout.title = "Wc Space Amp";
  Plotly.newPlot('space_amplification_plot', traces_for_plots["space_amplification_cost"], layout, {displayModeBar: false});

  layout.title = "Wc Stroage Space (MB)";
  Plotly.newPlot('storage_space_plot', traces_for_plots["storage_space"], layout, {displayModeBar: false});

}


function getInput(target){
  var input_T = getInputValbyId(`#${target}-input-T`);
  var input_E = convertToBytes(`#${target}-select-E`, getInputValbyId(`#${target}-input-E`));
  var input_N = getInputValbyId(`#${target}-input-N`);
  var input_M = convertToBytes(`#${target}-select-M`, getInputValbyId(`#${target}-input-M`));
  var input_f = getInputValbyId(`#${target}-input-f`);
  var input_F = input_M * input_f;
  var input_P = convertToBytes(`#${target}-select-P`, getInputValbyId(`#${target}-input-P`));
  var input_Mbf = convertToBytes(`#${target}-select-Mbf`, getInputValbyId(`#${target}-input-Mbf`));
  var input_s = getInputValbyId(`#${target}-input-s`);
  var input_mu = getInputValbyId(`#${target}-input-mu`);
  var input_phi = getInputValbyId(`#${target}-input-phi`);
  return {T: input_T, E: input_E, N: input_N, M: input_M, f: input_f, F: input_F, P: input_P, Mbf: input_Mbf, s: input_s, mu: input_mu, phi: input_phi};
}

function runCmp() {
	//console.log("ID:", this.id);
	var input_N = 0;
	if (this.id == "adjustable-progress-bar"){
		stopAllIndiv();
		window.focusedTree = "default";
		const newVal = window.progressSlider.getValue();
		input_N = newVal;
		const maxVal = window.progressSlider.getAttribute("max");
		const newPercentage = Math.floor(newVal / maxVal * 100);
		document.getElementById("progress-percentage-label").innerHTML = newPercentage + "%";
	} else if (["vlsm-progress-bar", "rlsm-progress-bar", "dlsm-progress-bar","osm-progress-bar"].indexOf(this.id) != -1){
		switch (this.id) {
			case "vlsm-progress-bar":
				window.focusedTree = "vlsm";
				break;
			case "rlsm-progress-bar":
				window.focusedTree = "rlsm";
				break;
			case "dlsm-progress-bar":
				window.focusedTree = "dlsm";
				break;
			case "osm-progress-bar":
				window.focusedTree = "osm";
				break;
		}
		input_N = window.sliders[window.focusedTree].getValue();
		//console.log("inputN:", input_N);
	}
	//console.log("focusedTree is", window.focusedTree);
	switch (window.focusedTree) {
		case "default":
			input_N = window.progressSlider.getValue();
			break;
		default:
			input_N = window.sliders[window.focusedTree].getValue();
			break;
	}
	//console.log("The Value Is", input_N);
  var target = "cmp";

  if(document.getElementById("customRadio2").checked){
    var input;
    ts = ["vlsm","rlsm","dlsm","osm"];
    for (var i = 0; i < 4; i++){
      //console.log(ts[i]);
      validate({id:"adjustable-progress-bar"}, ts[i], getInput(ts[i]));
    }
  }else{
    var input = getInput("cmp");
    validate(this, target, input);
  }




    switch (this.id) {
        case "cmp-vlsm-leveling":
            vlsm.update(target, 0);
            vlsm.show();
            break;
        case "cmp-vlsm-tiering":
            vlsm.update(target, 1);
            vlsm.show();
            break;
        // currently untriggered by event, unchanged merge policy
        // case "cmp-rlsm-leveling":
        //     rlsm.update(target, 0);
        //     rlsm.show();
        //     break;
        // case "cmp-rlsm-tiering":
        //     rlsm.update(target, 1);
        //     rlsm.show();
        //     break;
        case "cmp-bg-merging":
            //console.log("update rlsm background merging mode");
            rlsm.update(target);
            rlsm.show();
            break;
        case "cmp-threshold":
            //console.log("update rlsm background merging threshold");
            rlsm.update(target);
            rlsm.show();
            break;
        // currently untriggered by event, unchanged merge policy
        // case "cmp-dlsm-lazyLevel":
        //     dlsm.update(target, 1);
        //     dlsm.showBush();
        //     break;
        // case "cmp-osm-leveling":
        //     osm.update(target, 0);
        //     osm.show();
        //     break;
        case "cmp-leveling":
            //console.log("update Vanilla-LSM to leveling");
            vlsm.update(target, 0);
            vlsm.show();
            // currently untriggered by event, unchanged merge policy
            // dlsm.update(target, 1);
            // rlsm.update(target, 0);
            // osm.update(target, 0);
            // rlsm.show();
            // dlsm.show();
            // osm.show();
            break;
        case "cmp-tiering":
            //console.log("update Vanilla-LSM to tiering");
            vlsm.update(target, 1);
            vlsm.show();
            // currently untriggered by event, unchanged merge policy
            // rlsm.update(target, 1);
            // dlsm.update(target, 1);
            // osm.update(target, 1);
            // rlsm.show();
            // dlsm.show();
            // osm.show();
            break;
        default:
            console.log("simply update all");
			switch (window.focusedTree) {
				case "default":
                if(document.getElementById("customRadio2").checked){
                  vlsm.update("vlsm");
              		rlsm.update("rlsm");
              		dlsm.update("dlsm");
              		osm.update("osm");
              		vlsm.show();
              		rlsm.show();
              		dlsm.show();
              		osm.show();
                }else{
                  vlsm.update(target);
              		rlsm.update(target);
              		dlsm.update(target);
              		osm.update(target);
              		vlsm.show();
              		rlsm.show();
              		dlsm.show();
              		osm.show();
                }

					break;
				case "vlsm":
					vlsm.update(target);
					vlsm.show();
					break;
				case "rlsm":
					rlsm.update(target);
					rlsm.show();
					break;
				case "dlsm":
					dlsm.update(target);
					dlsm.show();
					break;
				case "osm":
					osm.update(target);
					osm.show();
					break;
			}
    }

    runPlots()
}


/* General API for runing different tree bush
 * Event driven
 */

function runIndiv() {
    var target = "";
    switch (this.id.charAt(0)) {
        case 'v':
            target = "vlsm";
            break;
        case 'r':
            target = "rlsm";
            break;
        case 'd':
            target = "dlsm";
            break;
        case 'o':
            target = "osm";
            break;
        default:
            //console.log(self.id);
            alert("Invalid: Unknown event target");
    }
    var obj = window.obj[target];

    var input = getInput(target)
    validate(this, target, input);

    if (this.id.includes("leveling")) {
        //console.log("update leveling demo");
        obj.update(target, 0);
    } else if (this.id.includes("tiering")) {
        //console.log("update tiering demo");
        obj.update(target, 1);
    } else {
        //console.log("simply update");
        obj.update(target);
    }
    obj.show();
}

/* Validate and correct the input */
function validate(self, target, input) {
    // T >= 2, N, E > 1, M > 1
	//console.log("tgt=", target);
    // if (!self.classList.contains(`${target}-input`)) {
    //     alert(`Invalid: Unknown ${target} configuration input`);
    //     return;
    // }
    switch (self.id) {
        case `${target}-input-T`:
            if (input.T < 2 || !Number.isInteger(input.T)) {
                if (!Number.isInteger(input.T)) {
                    alert("Invalid input: the ratio of LSM-Tree should be an integer");
                    restoreInput(`#${target}-input-T`);
                    break;
                }
                if (input.T < 2) {
                    alert("Invalid input: the minimal ratio of LSM-Tree is 2");
                    restoreInput(`#${target}-input-T`);
                    break;
                }
            } else {
                setInput(`#${target}-input-T`);
            }
            break;
        case `${target}-input-N`:
            if (input.N < 1 || !Number.isInteger(input.N)) {
                if (!Number.isInteger(input.N)) {
                    alert("Invalid input: the #entreis should be an integer");
                    restoreInput(`#${target}-input-N`);
                    break;
                }
                if (input.N < 1) {
                    alert("Invalid input: the minimal #entries is 1");
                    restoreInput(`#${target}-input-N`);
                    break;
                }
            } else {
                setInput(`#${target}-input-N`);
            }
            break;
        case `${target}-input-E`:
        case `${target}-select-E`:
            if (input.E < 1 || input.E > input.M || input.E > input.P || input.E > input.F) {
                //restore to legally previous state
                if (input.E < 1) {
                    alert("Invalid input: the minimal size of an entry is 1 byte");
                    restoreInput(`#${target}-input-E`, `#${target}-select-E`);
                    break;
                }
                if (input.E > input.P) {
                    alert("Invalid input: the maximal size of an entry should be <= page size");
                    restoreInput(`#${target}-input-E`, `#${target}-select-E`);
                    break;
                }
                if (input.E > input.F) {
                    alert("Invalid input: the maximal size of an entry should be <= file size");
                    restoreInput(`#${target}-input-E`, `#${target}-select-E`);
                    break;
                }
                if (input.E > input.M) {
                    alert("Invalid input: the maximal size of an entry should be <= buffer size");
                    restoreInput(`#${target}-input-E`, `#${target}-select-E`);
                    break;
                }
            } else {    // save new state
                setInput(`#${target}-input-E`, `#${target}-select-E`);
            }
            break;
        case `${target}-input-M`:
        case `${target}-select-M`:
            if (input.M < 1 || input.M < input.E || input.M < input.P || input.F < 1 || input.F < input.P) {

                if (input.F < input.P) {
                    alert("Invalid input: in terms of buffer, the corresponding file size shoud not be < page size");
                    restoreInput(`#${target}-input-M`, `#${target}-select-M`);
                    break;
                }
                if (input.F < 1) {
                    alert("Invalid input: in terms of buffer, the corresponding file size shoud not be < 1 byte");
                    restoreInput(`#${target}-input-M`, `#${target}-select-M`);
                    break;
                }
                if (input.M < input.P) {
                    alert("Invalid input: the minimal size of buffer should be >= page size");
                    restoreInput(`#${target}-input-M`, `#${target}-select-M`);
                    break;
                }
                if (input.M < input.E) {
                    alert("Invalid input: the minimal size of buffer should be >= entry size");
                    restoreInput(`#${target}-input-M`, `#${target}-select-M`);
                    break;
                }
                if (input.M < 1) {
                    alert("Invalid input: the minimal size of buffer is 1 byte");
                    restoreInput(`#${target}-input-M`, `#${target}-select-M`);
                    break;
                }
            } else {
                setInput(`#${target}-input-M`, `#${target}-select-M`);
            }
            break;
        case `${target}-input-P`:  //1byte <= P <= E & M & F
        case `${target}-select-P`:
            if (input.P < 1 || input.P < input.E || input.P > input.M || input.P > input.F) {
                if (input.P < input.E) {
                    alert("Invalid input: the minimal size of a page should be >= entry size");
                    restoreInput(`#${target}-input-P`, `#${target}-select-P`);
                    break;
                }
                if (input.P < 1) {
                    alert("Invalid input: the minimal size of a page should be >= 1 byte");
                    restoreInput(`#${target}-input-P`, `#${target}-select-P`);
                    break;
                }
                if (input.P > input.F) {
                    alert("Invalid input: the maximal size of a page should be <= file size");
                    restoreInput(`#${target}-input-P`, `#${target}-select-P`);
                    break;
                }
                if (input.P > input.M) {
                    alert("Invalid input: the maximal size of a page should be <= buffer size");
                    restoreInput(`#${target}-input-P`, `#${target}-select-P`);
                    break;
                }
            } else {
                setInput(`#${target}-input-P`, `#${target}-select-P`);
            }
            break;
        case `${target}-input-Mbf`:  //0byte <= Mbf <= M
        case `${target}-select-Mbf`:
            if (input.Mbf < 0) {
                alert("Invalid input: the minimal memory allocated for bloom filters should be >= 0 byte");
                restoreInput(`#${target}-input-Mbf`, `#${target}-select-Mbf`);
            } else {
                setInput(`#${target}-input-Mbf`, `#${target}-select-Mbf`);
            }
            break;
        case `${target}-input-f`:  //global setting: 1byte <= F <= M
            if (input.F < 1 || input.F < input.P || input.F < input.E || input.F > input.M) {
                if (input.F < input.P) {
                    alert("Invalid input: the minimal size of a file should be >= page size");
                    restoreInput("#cmp-input-f");
                    break;
                }
                if (input.F < input.E) {
                    alert("Invalid input: the minimal size of a file should be >= entry size");
                    restoreInput("#cmp-input-f");
                    break;
                }
                if (input.F < 1) {
                    alert("Invalid input: the minimal size of a file should be >= 1 byte");
                    restoreInput("#cmp-input-f");
                    break;
                }
                if (input.F > input.M) {
                    alert("Invalid input: in global setting, the maximal size of a file should be <= buffer size");
                    restoreInput("#cmp-input-f");
                    break;
                }
            } else {
                setInput("#cmp-input-f");
            }
            break;


        // case `${target}-input-f`:  //TODO: individual setting in terms of leveling and tiering
        //     if (input.F <= min || input.F > max) document.querySelector(`#${target}-input-f`).value = 1;
        //     break;
        case `${target}-input-s`:  //0 <= s <= 100
            if (input.s < 0 || input.s > 100) {
                if (input.s < 0) {
                    alert("Invalid input: the selectivity of a range query should be >= 0");
                    restoreInput(`#${target}-input-s`);
                    break;
                }
                if (input.s > 100) {
                    alert("Invalid input: the selectivity of a range query should be <= 100");
                    restoreInput(`#${target}-input-s`);
                    break;
                }
            } else {
                setInput(`#${target}-input-s`);
            }
            break;
        case `${target}-input-mu`:  //mu > 0
            if (input.mu <= 0) {
                alert("Invalid input: the storage read speed >= 0");
                restoreInput(`#${target}-input-mu`);
            } else {
                setInput(`#${target}-input-mu`);
            }
            break;
        case `${target}-input-phi`:  //phi > 0
            if (input.phi <= 0) {
                alert("Invalid input: the storage write speed should be >= 0");
                restoreInput(`#${target}-input-phi`);
            } else {
                setInput(`#${target}-input-phi`);
            }
            break;
        case `${target}-select-Mf`:  //TODO
        case `${target}-input-Mf`:  //TODO
        case `${target}-tiering`:
        case `${target}-leveling`:
        case `${target}-vlsm-tiering`:
        case `${target}-vlsm-leveling`:
        case `${target}-bg-merging`:
        case `${target}-threshold`:
        // currently untriggered by event, unchanged merge policy
        // case `${target}-rlsm-leveling`:
        // case `${target}-rlsm-tiering`:
        // case `${target}-dlsm-lazyLevel`:
        // case `${target}-osm-tiering`:
        // case `${target}-osm-leveling`:
            break;
		case "adjustable-progress-bar":
			break;
		case "vlsm-progress-bar":
			break;
		case "rlsm-progress-bar":
			break;
		case "dlsm-progress-bar":
			break;
		case "osm-progress-bar":
			break;
        default:
            //console.log(self.id);
            alert(`Invalid: Unknown ${target} configuration input`);
    }
    return;
}

function restoreInput(inputTarget, unitTarget) {
    var inputElem = document.querySelector(inputTarget);
    inputElem.value = inputElem.dataset.preval;
    if (unitTarget !== undefined) {
        var unitElem = document.querySelector(unitTarget);
        unitElem.selectedIndex = unitElem.dataset.preunit;
    }
}
function setInput(inputTarget, unitTarget) {
    var inputElem = document.querySelector(inputTarget);
    inputElem.dataset.preval = inputElem.value;
    if (unitTarget !== undefined) {
        var unitElem = document.querySelector(unitTarget);
        unitElem.dataset.preunit = unitElem.selectedIndex;
    }
}
function increaseInput() {
    var input_elem = this.parentElement.previousElementSibling;
    if (input_elem.step === "") {
        input_elem.value = nextPowerOfTwo(getInputVal(input_elem));
    } else if (input_elem.step == 10) {
		const nval = getInputValbyId("#cmp-input-N");
		const val = getInputVal(input_elem);
		if (nextPowerOfTen(val) < nval) {
			input_elem.value = nextPowerOfTen(val);
		} else {
			input_elem.value = nval;
		}
	}else {
        input_elem.value = correctDecimal(getInputVal(input_elem) + parseFloat(input_elem.step));
    }
	if (this.id == "cmp-increase-N") {
		window.progressSlider.setAttribute("max", getInputValbyId("#cmp-input-N"));
		//document.querySelector("#adjustable-progress-bar")["aria-valuenow"] = 0;
		changeProgressBar(window.progressSlider, 0);
		document.getElementById("progress-percentage-label").innerHTML = "0%";
		setUpSliderMaxVal(window.sliders["vlsm"]);
		setUpSliderMaxVal(window.sliders["rlsm"]);
		setUpSliderMaxVal(window.sliders["dlsm"]);
		setUpSliderMaxVal(window.sliders["osm"]);
	}
	if (this.id != "granularity-increase") {
    	var event = new Event('change');
    	input_elem.dispatchEvent(event);
	} else {
		window.granularity = input_elem.value;
	}
}
function decreaseInput() {
    var input_elem = this.parentElement.previousElementSibling;
    if (input_elem.step === "") {
        input_elem.value = lastPowerOfTwo(getInputVal(input_elem));
    } else if (input_elem.step == 10) {
		const nval = getInputValbyId("#cmp-input-N");
		const val = getInputVal(input_elem);
		if (val == nval) {
			input_elem.value = lastPowerOfTen(nval);
		} else {
			input_elem.value = val / 10;
		}
	} else {
        input_elem.value = correctDecimal(getInputVal(input_elem) - parseFloat(input_elem.step));
    }
	if (this.id == "cmp-decrease-N") {
		window.progressSlider.setAttribute("max", getInputValbyId("#cmp-input-N"));
		//document.querySelector("#adjustable-progress-bar")["aria-valuenow"] = 0;
		changeProgressBar(window.progressSlider, 0);
		document.getElementById("progress-percentage-label").innerHTML = "0%";
		setUpSliderMaxVal(window.sliders["vlsm"]);
		setUpSliderMaxVal(window.sliders["rlsm"]);
		setUpSliderMaxVal(window.sliders["dlsm"]);
		setUpSliderMaxVal(window.sliders["osm"]);
	}
	if (this.id != "granularity-decrease") {
    	var event = new Event('change');
    	input_elem.dispatchEvent(event);
	}  else {
		window.granularity = input_elem.value;
	}
}

function startPlaying() {
	//if (this.playing) return;
	//this.playing = "playing";
	var playingProgressBarId = "adjustable-progress-bar";
	var treeName = "default";
	if (this.id == "vlsm-autoplay-button") {
		window.focusedTree = "vlsm";
		this.src = "img/pause_circle_outline_black_24dp.svg"
		this.classList.remove("play-class");
		this.classList.add("pause-class");
		playingProgressBarId = "vlsm-progress-bar";
		treeName = "vlsm";
	}
	else if (this.id == "rlsm-autoplay-button") {
		window.focusedTree = "rlsm";
		this.src = "img/pause_circle_outline_black_24dp.svg"
		this.classList.remove("play-class");
		this.classList.add("pause-class");
		playingProgressBarId = "rlsm-progress-bar"
		treeName = "rlsm";
	}
	else if (this.id == "dlsm-autoplay-button") {
		window.focusedTree = "dlsm";
		this.src = "img/pause_circle_outline_black_24dp.svg"
		this.classList.remove("play-class");
		this.classList.add("pause-class");
		playingProgressBarId = "dlsm-progress-bar"
		treeName = "dlsm";
	}
	else if (this.id == "osm-autoplay-button") {
		window.focusedTree = "osm";
		this.src = "img/pause_circle_outline_black_24dp.svg"
		this.classList.remove("play-class");
		this.classList.add("pause-class");
		playingProgressBarId = "osm-progress-bar"
		treeName = "osm";
	}

	if (playingProgressBarId == "adjustable-progress-bar")
	{
		stopAllIndiv();
		var sliderElem = document.getElementById("control-panel").style.visibility = "visible";
		if (document.getElementById("progress-percentage-label").innerHTML == "100%") {
			changeProgressBar(window.progressSlider, 0);
		}
		const id = setInterval(progressAdvance, 500);
		window.progressEventId = id;
		//document.querySelector("#adjustable-progress-bar")["timeevent-id"] = id;
		function progressAdvance() {
			//const currentVal = document.querySelector("#adjustable-progress-bar")["aria-valuenow"];
			//console.log("runTime");
			const currentVal = window.progressSlider.getValue();
			if (window.progressEventId && currentVal < window.progressSlider.getAttribute("max")) {
				//changeProgressBar(currentVal + 1);
				//console.log("currentVal : ", currentVal);
        var input_E = convertToBytes("#cmp-select-E", getInputValbyId("#cmp-input-E"));
				var input_M = convertToBytes("#cmp-select-M", getInputValbyId("#cmp-input-M"));
				var coeff = Math.floor(input_M / input_E);
        if(document.getElementById("customRadio2").checked){
          var min_coeff = Number.MAX_SAFE_INTEGER;
          var tmp_coeff;
          var ts = ["vlsm","rlsm","dlsm","osm"];
          for (var i = 0; i < 4; i++){
            tmp_coeff = Math.floor(convertToBytes(`#${ts[i]}-select-M`, getInputValbyId(`#${ts[i]}-input-M`))/convertToBytes(`#${ts[i]}-select-E`, getInputValbyId(`#${ts[i]}-input-E`)));
            if(tmp_coeff < min_coeff){
              min_coeff = tmp_coeff;
            }
          }
          coeff = min_coeff;
        }

				const unit = coeff * window.granularity;
				//console.log("coeff:" + coeff);
				const newVal = (Math.floor(currentVal / unit) + 1) * unit;
				//window.progressSlider.setValue(newVal);
				changeProgressBar(window.progressSlider, newVal);
				var event = new Event('change');
				// var input_elem = document.querySelector("#cmp-input-N");
				var elem = document.querySelector("#adjustable-progress-bar");
				elem.dispatchEvent(event);
				//document.querySelector("#adjustable-progress-bar").onchange();
			} else {
				//console.log("Stttopppp", currentVal);
				clearInterval(id);
				//this.playing = null;
			}
		}
	}
	else {
		stopMain();
		const button = this;
		function localProgressAdvance() {
			var curProgress = window.sliders[treeName].getValue();
			const max = getInputValbyId("#cmp-input-N");
			// if (button.id == "dlsm-autoplay-button") {
			// 	console.log("MAX =", max);
			// }
			if (curProgress >= max) {
				//clearInterval(window.runningIds[playingProgressBarId]);
				stopPlaying.call(button);
			} else {
    			const input_E = convertToBytes("#cmp-select-E", getInputValbyId("#cmp-input-E"));
				const input_M = convertToBytes("#cmp-select-M", getInputValbyId("#cmp-input-M"));
				const coeff = Math.floor(input_M / input_E);
				const unit = coeff * window.granularity;
				//console.log("coeff:" + coeff);
				const newVal = (Math.floor(curProgress / unit) + 1) * unit;
				//window.progressSlider.setValue(newVal);
				//console.log("treeName:", treeName);
				changeProgressBar(window.sliders[treeName], newVal);
				window.individualProgress[treeName] = newVal;
				var event = new Event('change');
				//console.log("indivprogressbar: ", "#"+playingProgressBarId);
				document.querySelector("#" + playingProgressBarId).dispatchEvent(event);
				//document.querySelector("#" + playingProgressBarId).onchange();
			}
		}
		const localId = setInterval(localProgressAdvance, 500);
		window.runningIds[playingProgressBarId] = localId;
	}
}

function stopPlaying() {
	//console.log("Stopped:", this.id);
	if (this.id == "vlsm-autoplay-button") {
		this.src = "img/play_circle_outline_black_24dp.svg";
		this.classList.remove("pause-class");
		this.classList.add("play-class");
		//console.log("Cleared vlsm");
		clearInterval(window.runningIds["vlsm-progress-bar"]);
		window.runningIds["vlsm-progress-bar"] = null;
	} else
	if (this.id == "rlsm-autoplay-button") {
		this.src = "img/play_circle_outline_black_24dp.svg";
		this.classList.remove("pause-class");
		this.classList.add("play-class");
		//console.log("Cleared rlsm");
		clearInterval(window.runningIds["rlsm-progress-bar"]);
		window.runningIds["rlsm-progress-bar"] = null;
	} else
	if (this.id == "dlsm-autoplay-button") {
		this.src = "img/play_circle_outline_black_24dp.svg";
		this.classList.remove("pause-class");
		this.classList.add("play-class");
		//console.log("Cleared dlsm");
		clearInterval(window.runningIds["dlsm-progress-bar"]);
		window.runningIds["dlsm-progress-bar"] = null;
	} else
	if (this.id == "osm-autoplay-button") {
		this.src = "img/play_circle_outline_black_24dp.svg";
		this.classList.remove("pause-class");
		this.classList.add("play-class");
		//console.log("Cleared osm");
		clearInterval(window.runningIds["osm-progress-bar"]);
		window.runningIds["osm-progress-bar"] = null;
	}

	else if (window.progressEventId) {
		//console.log("Cleared window");
		clearInterval(window.progressEventId);
		window.progressEventId = null;
		//this.previousElementSibling.playing = null;
	}
}

function resetProgress() {
	stopPlaying();
	//window.progressSlider.setValue(0);
	changeProgressBar(window.progressSlider, 0);
}

function finishProgress() {
	const maxVal = window.progressSlider.getAttribute("max");
	//window.progressSlider.setValue(maxVal);
	changeProgressBar(window.progressSlider, maxVal);
	document.querySelector("#adjustable-progress-bar").onchange();
	//console.log("Cleared fprogress");
	clearInterval(window.progressEventId);
	window.progressEventId = null;
}

function buttonChange() {
	if (this.classList.contains("play-class")) startPlaying.call(this);
	else if (this.classList.contains("pause-class")) stopPlaying.call(this);
}

function setUpGranularityOptions() {

}

function selectGranularity() {
	stopPlaying();
	resetProgress();
}

function clickProgressBar() {

}

function dragHandler() {
	//console.log("Drag handler called");
	stopMain();
	stopAllIndiv();
	var event = new Event('change');
	// var input_elem = document.querySelector("#cmp-input-N");
	this.dispatchEvent(event);
}

function changeProgressCapacity(slider) {
	//console.log("Event Triggered");
	const newVal = getInputValbyId("#cmp-input-N");
	//window.progressSlider.setAttribute("max", newVal);
	if (this.id == "cmp-input-N") {
		window.progressSlider.setAttribute("max", newVal);
		window.sliders.forEach(function(slider) {slider.setAttribute("max", newVal);});
    //runCmp();
	}
}

function switchViewType() {
	if (this.id == "dynamic-view") {
		if (!this.classList.contains("btn-active")) {
			this.classList.add("btn-active");
			this.nextElementSibling.classList.remove("btn-active");
			document.querySelector("#control-panel").style["display"] = "block";
		}
	} else if (this.id == "static-view") {
		if (!this.classList.contains("btn-active")) {
			this.classList.add("btn-active");
			this.previousElementSibling.classList.remove("btn-active");
			document.querySelector("#control-panel").style["display"] = "none";
		}
	}
}
//Common Methods

/* FIXED precision of decimal eg. 0.1 + 0.2 = 0.3000000000000004
 * by rounding to a fixed number of decimal places of 15
 */
function correctDecimal(number) {
    return parseFloat(number.toPrecision(15));
}

function roundTo(number, digits) {
    return parseFloat(number.toFixed(digits));
}

function convertToBytes(target, input) {
    var selector = document.querySelector(target);
    var value = selector[selector.selectedIndex].value;
    switch (value) {
        case "0":  //B
            return input;
        case "1":  //KB
            return input * Math.pow(2, 10);
        case "2":  //MB
            return input * Math.pow(2, 20);
        case "3":  //GB
            return input * Math.pow(2, 30);
        default:
        //console.log(value);
        alert(`Invalid: Unknown value of unit in ${target}`);
    }
}

function getInputValbyId(id) {
    return parseFloat(document.querySelector(id).value);
}
function getInputVal(elem) {
    return parseFloat(elem.value);
}
function setInputValbyId(id, val) {
    return document.querySelector(id).value = val;
}
function setInputVal(elem, val) {
    return elem.value = val;
}

function getBaseLog(x, y) {
    if (isNaN(x) || isNaN(y)) throw new TypeError("x: " + x +", y: " + y + " must be numbers");
    if (!(x > 0 && y > 0)) {
        throw new RangeError("x: " + x +", y: " + y + " both must > 0");
    } else {
        return correctDecimal(Math.log(y) / Math.log(x));
    }
}

function isPowerOfTwo(x) {
    if (isNaN(x)) throw new TypeError(x + " must be a number");
    if (x == 0) return false;
    else return x && !(x & (x - 1));
}

function nextPowerOfTwo(x) {
    // The reuslt should not less than 1
    if (isNaN(x)) throw new TypeError(x + " must be a number");
    if (x < 1) return 1;
    var exp = Math.ceil(getBaseLog(2, x));
    var result = Math.pow(2, exp);
    return (x === result) ? result * 2 : result;
}

function nextPowerOfTen(x) {
	// The reuslt should not less than 1
	if (isNaN(x)) throw new TypeError(x + " must be a number");
	if (x < 1) return 1;
	var exp = Math.ceil(getBaseLog(10, x));
	var result = Math.pow(10, exp);
	return (x === result) ? result * 10 : result;
}

function lastPowerOfTwo(x) {
    // The reuslt should not less than 1
    if (isNaN(x)) throw new TypeError(x + " must be a number");
    if (x <= 1) return 1;
    var exp = Math.floor(getBaseLog(2, x));
    var result = Math.pow(2, exp);
    return (x === result) ? result / 2 : result;
}

function lastPowerOfTen(x) {
	if (isNaN(x)) throw new TypeError(x + " must be a number");
    if (x <= 1) return 1;
    var exp = Math.floor(getBaseLog(10, x));
    var result = Math.pow(10, exp);
    return (x === result) ? result / 10 : result;
}


function setToolTip(elem, pos, text) {
    if (!(typeof pos === 'string' || pos instanceof String)) {
        throw new TypeError(pos + " must be a string or string object");
    } else if (!(pos == "left" || pos == "right" || pos == "top" || pos == "bottom")){
        throw new RangeError(pos + " must be a left or right or top or bottom");
    }
    elem.setAttribute("data-toggle", "tooltip");
    elem.setAttribute("data-placement", pos);
    elem.setAttribute("title", "" + text);
}

function setRunGradient(elem, rate1, file_num, rate2, full) {
    var color1 = "#1e90ff"; // First file color
    var color2 = "#fff"; // White space
	var color3 = "#4169e1"; // Second file color
	var color4 = "#95a5a6"; // Grey
    //var rate1 = file_num/pcap;
	const setFileColoring = function(rate, file_num) {
		//const step = unit_width * 100 ;
		const step = rate * 100 / file_num;
		for (let i = 0; i < file_num; i ++) {
			const stop = Math.min(step * (i + 1) , 100);
			if (i % 2 == 0) {
				coloring = coloring + `${color1} ${stop}%,0,`;
			} else {
				coloring = coloring + `${color3} ${stop}%,0,`;
			}
		}
		//console.log("Coloring: ", coloring);
		return coloring;
	}
	//var omission_width = unit_width * 2;
    if (rate1 === 0) {
        //rate1 = 0;
        rate2 = 0;
    }
	var coloring = "";

    var prev_style = elem.getAttribute("style");
	if (!file_num) {
    	elem.setAttribute("style", prev_style + `; background:linear-gradient(to right, ${color1} ${rate1*100}%, 0, ${color2} ${(1 - rate1)*100}%)`);
	} else if (!rate2){
		elem.setAttribute("style", prev_style + `; background:linear-gradient(to right, ${setFileColoring(rate1, file_num)} ${color2} ${(1 - rate1)*100}%`);
	} else if (full) {
		//rate1 = (pcap - 3) * 100 / pcap;
		//elem.setAttribute("style", prev_style + `; background:linear-gradient(to right, ${setFileColoring(rate1, file_num)} ${color4} ${(rate2)*100}%, 0, ${color3} ${(1 - rate2)*100}%`);
		elem.setAttribute("style", prev_style + `; background:linear-gradient(to right, ${setFileColoring(rate1, file_num)} ${color4} ${(rate2)*100}%`);
	} else {
		//elem.setAttribute("style", prev_style + `; background:linear-gradient(to right, ${setFileColoring(rate1, file_num)} ${color4} ${(rate2) * 100}%, 0, ${color2} ${(1 - rate2) * 100}%)`)
		elem.setAttribute("style", prev_style + `; background:linear-gradient(to right, ${setFileColoring(rate1, file_num)} ${color4} ${(rate2) * 100}%`)
	}
}

function setRunGradientWrapper(button, entry_num, level_space, display_unit) {
	//console.log("entry num ", entry_num);
	const width = button.style.width.slice(0, -2);
	//console.log("display unit: ", display_unit);
	//console.log("width: ", width);
	//console.log("rate: ", (display_unit * entry_num) / width);
	//console.log("level space: ", level_space);
	if (Math.round(width / display_unit) < level_space && width / display_unit <= entry_num + 1 && level_space > 4) {
		const display_num = Math.ceil(width / display_unit);
		if (entry_num < level_space) {
			setRunGradient(button, (display_num - 3) * display_unit / width, display_num - 3, 1 - display_unit / width, false);
			var ellipsis_node = document.createElement("span");
			ellipsis_node.classList.add("ellipsis");
			ellipsis_node.style['position'] = "absolute";
			ellipsis_node.style['left'] = ((display_num - 3) * display_unit) + "px";
			ellipsis_node.style['width'] = (width - (display_num - 2) * display_unit) + "px";
			//ellipsis_node.style['height'] = 0.5 * button.style.height.slice(0, -2) + "px";
			//console.log("top:", ellipsis_node.style['top']);
			//ellipsis_node.align = "center";
			ellipsis_node.innerHTML = "+" + (entry_num - display_num + 3);
			button.style['position'] = "relative";
			button.appendChild(ellipsis_node);
			/*var lightbulb_icon = document.createElement("span");
			lightbulb_icon.classList.add("material-icons");
			lightbulb_icon.innerHTML = "lightbulb";
			button.appendChild(lightbulb_icon);*/

		} else {
			setRunGradient(button, (display_num - 3) * display_unit / width, display_num - 3, 1 - display_unit / width, true);
			var ellipsis_node = document.createElement("span");
			ellipsis_node.classList.add("ellipsis");
			ellipsis_node.style['position'] = "absolute";
			ellipsis_node.style['left'] = ((display_num - 3) * display_unit) + "px";
			ellipsis_node.style['width'] = (width - (display_num - 2) * display_unit) + "px";
			//ellipsis_node.style['height'] = 0.5 * button.style.height.slice(0 , -2) + "px";
			//console.log("top:", ellipsis_node.style['top']);
			//ellipsis_node.align = "center";
			ellipsis_node.innerHTML = "...";
			button.style['position'] = "relative";
			button.appendChild(ellipsis_node);
			/*var lightbulb_icon = document.createElement("span");
			lightbulb_icon.classList.add("material-icons-outlined");
			lightbulb_icon.innerHTML = "lightbulb";
			button.appendChild(lightbulb_icon);*/
		}
	} else {
		setRunGradient(button, entry_num * display_unit / width, entry_num);
		/*var lightbulb_icon = document.createElement("span");
		lightbulb_icon.classList.add("material-icons-outlined");
		lightbulb_icon.innerHTML = "lightbulb";
		button.appendChild(lightbulb_icon);*/
	}

}

function createDots(width) {
    var dots = document.createElement("span");
    dots.setAttribute("class", "abbr-dot text-center");
    dots.setAttribute("style", "width:" + width);
    dots.textContent = "..."
    return dots;
}

function createBtn(width) {
    var btn = document.createElement("button");
    btn.setAttribute("type", "button");
    btn.setAttribute("class", "lsm-btn btn btn-secondary");
    btn.setAttribute("style", "width:" + width);
    return btn;
}

function showElem(query) {
    var elementList = document.querySelectorAll(query);
    for (let elem of elementList) {
        elem.style.display = "";
    }
}

function hideElem(query) {
    var elementList = document.querySelectorAll(query);
    for (let elem of elementList) {
        elem.style.display = "none";
    }
}

function clear(element) {
	clearTimeout(window.blinkingId);
    while (element.firstChild) {
		if (element.firstChild.firstChild) {
			var btns = element.firstChild.firstChild.childNodes;
			//console.log(btns);
			for (i in btns) {
				//$(btns[i]).tooltip('dispose');
        $(btns[i]).tooltip("dispose");
			}
		}
		if (element.firstChild.firstChild) $(element.firstChild.firstChild).tooltip('dispose');
        element.removeChild(element.firstChild);
    }
}

function clearGroups(element) {
	clearTimeout(window.blinkingId);
	while (element.firstChild) {
		var btns = element.firstChild.childNodes;


	}
}

function setUpSliderMaxVal(slider) {
	slider.setAttribute("max", getInputValbyId("#cmp-input-N"));
}

function initSlider() {
    window.cmpSlider = new Slider("#cmp-threshold", {
    formatter: function(value) {
        return value + "%";
    },
    value: 5,
    precision: 20
    });

    window.rlsmSlider = new Slider("#rlsm-threshold", {
    formatter: function(value) {
        return value + "%";
    },
    value: 5,
    precision: 20
    });

	window.progressSlider = new Slider("#adjustable-progress-bar", {
		formatter: function(value) {
			return value;
		},
		value: 0,
		precision: 20,
		max: getInputValbyId("#cmp-input-N")
	});
	window.progressSlider.on("slideStop", dragHandler);

	window.progressSlider.max = getInputValbyId("#cmp-input-N");

	window.vlsmProgressSlider = new Slider("#vlsm-progress-bar", {
		formatter: function(value) {
			return value;
		},
		value: 0,
		precision: 20,
		max: getInputValbyId("#cmp-input-N")
	});
	window.vlsmProgressSlider.on("slideStop", dragHandler);


	window.rlsmProgressSlider = new Slider("#rlsm-progress-bar", {
		formatter: function(value) {
			return value;
		},
		value: 0,
		precision: 20,
		max: getInputValbyId("#cmp-input-N")
	});
	window.rlsmProgressSlider.on("slideStop", dragHandler);

	window.dlsmProgressSlider = new Slider("#dlsm-progress-bar", {
		formatter: function(value) {
			return value;
		},
		value: 0,
		precision: 20,
		max: getInputValbyId("#cmp-input-N")
	});
	window.dlsmProgressSlider.on("slideStop", dragHandler);

	window.osmProgressSlider = new Slider("#osm-progress-bar", {
		formatter: function(value) {
			return value;
		},
		value: 0,
		precision: 20,
		max: getInputValbyId("#cmp-input-N")
	});
	window.osmProgressSlider.on("slideStop", dragHandler);

	window.sliders = new Map();
	window.sliders["vlsm"] = window.vlsmProgressSlider;
	window.sliders["rlsm"] = window.rlsmProgressSlider;
	window.sliders["dlsm"] = window.dlsmProgressSlider;
	window.sliders["osm"] = window.osmProgressSlider;

	//console.log("granularity = ", document.querySelector("#granularity-input"));
	window.granularity = document.querySelector("#granularity-input").value;

	window.runningIds = new Map();
}

function stopMain() {
	stopPlaying.call(document.querySelector("#autoplay-button"))
}

function stopAllIndiv() {
	stopPlaying.call(document.querySelector("#vlsm-autoplay-button"));
	stopPlaying.call(document.querySelector("#rlsm-autoplay-button"));
	stopPlaying.call(document.querySelector("#dlsm-autoplay-button"));
	stopPlaying.call(document.querySelector("#osm-autoplay-button"));
}



// var mySlider = new Slider("#cmp-threshold", {
//     formatter: function(value) {
//         return value + "%";
//     },
//     value: 5,
//     precision: 20
// });
initPlot();
initSlider();
initCmp();


// Event attributes, trigger
// Analysis mode selection trigger
document.querySelector("#customRadio1").onclick = display;
document.querySelector("#customRadio2").onclick = display;
// Comparative LSM analysis event trigger
document.querySelector("#cmp-increase-T").onclick = increaseInput;
document.querySelector("#cmp-decrease-T").onclick = decreaseInput;
document.querySelector("#cmp-increase-E").onclick = increaseInput;
document.querySelector("#cmp-decrease-E").onclick = decreaseInput;
document.querySelector("#cmp-increase-N").onclick = increaseInput;
document.querySelector("#cmp-decrease-N").onclick = decreaseInput;
document.querySelector("#cmp-increase-M").onclick = increaseInput;
document.querySelector("#cmp-decrease-M").onclick = decreaseInput;
document.querySelector("#cmp-increase-f").onclick = increaseInput;
document.querySelector("#cmp-decrease-f").onclick = decreaseInput;
document.querySelector("#cmp-increase-P").onclick = increaseInput;
document.querySelector("#cmp-decrease-P").onclick = decreaseInput;
document.querySelector("#cmp-increase-Mbf").onclick = increaseInput;
document.querySelector("#cmp-decrease-Mbf").onclick = decreaseInput;
document.querySelector("#cmp-increase-s").onclick = increaseInput;
document.querySelector("#cmp-decrease-s").onclick = decreaseInput;
document.querySelector("#cmp-increase-mu").onclick = increaseInput;
document.querySelector("#cmp-decrease-mu").onclick = decreaseInput;
document.querySelector("#cmp-increase-phi").onclick = increaseInput;
document.querySelector("#cmp-decrease-phi").onclick = decreaseInput;
document.querySelector("#cmp-increase-num-tired-levels").onclick = increaseInput;
document.querySelector("#cmp-decrease-num-tired-levels").onclick = decreaseInput;
document.querySelector("#vlsm-increase-T").onclick = increaseInput;
document.querySelector("#vlsm-decrease-T").onclick = decreaseInput;
document.querySelector("#vlsm-increase-E").onclick = increaseInput;
document.querySelector("#vlsm-decrease-E").onclick = decreaseInput;
document.querySelector("#vlsm-increase-N").onclick = increaseInput;
document.querySelector("#vlsm-decrease-N").onclick = decreaseInput;
document.querySelector("#vlsm-increase-M").onclick = increaseInput;
document.querySelector("#vlsm-decrease-M").onclick = decreaseInput;
document.querySelector("#vlsm-increase-f").onclick = increaseInput;
document.querySelector("#vlsm-decrease-f").onclick = decreaseInput;
document.querySelector("#vlsm-increase-P").onclick = increaseInput;
document.querySelector("#vlsm-decrease-P").onclick = decreaseInput;
document.querySelector("#vlsm-increase-Mbf").onclick = increaseInput;
document.querySelector("#vlsm-decrease-Mbf").onclick = decreaseInput;
document.querySelector("#vlsm-increase-s").onclick = increaseInput;
document.querySelector("#vlsm-decrease-s").onclick = decreaseInput;
document.querySelector("#vlsm-increase-mu").onclick = increaseInput;
document.querySelector("#vlsm-decrease-mu").onclick = decreaseInput;
document.querySelector("#vlsm-increase-phi").onclick = increaseInput;
document.querySelector("#vlsm-decrease-phi").onclick = decreaseInput;
document.querySelector("#rlsm-increase-T").onclick = increaseInput;
document.querySelector("#rlsm-decrease-T").onclick = decreaseInput;
document.querySelector("#rlsm-increase-E").onclick = increaseInput;
document.querySelector("#rlsm-decrease-E").onclick = decreaseInput;
document.querySelector("#rlsm-increase-N").onclick = increaseInput;
document.querySelector("#rlsm-decrease-N").onclick = decreaseInput;
document.querySelector("#rlsm-increase-M").onclick = increaseInput;
document.querySelector("#rlsm-decrease-M").onclick = decreaseInput;
document.querySelector("#rlsm-increase-f").onclick = increaseInput;
document.querySelector("#rlsm-decrease-f").onclick = decreaseInput;
document.querySelector("#rlsm-increase-P").onclick = increaseInput;
document.querySelector("#rlsm-decrease-P").onclick = decreaseInput;
document.querySelector("#rlsm-increase-Mbf").onclick = increaseInput;
document.querySelector("#rlsm-decrease-Mbf").onclick = decreaseInput;
document.querySelector("#rlsm-increase-s").onclick = increaseInput;
document.querySelector("#rlsm-decrease-s").onclick = decreaseInput;
document.querySelector("#rlsm-increase-mu").onclick = increaseInput;
document.querySelector("#rlsm-decrease-mu").onclick = decreaseInput;
document.querySelector("#rlsm-increase-phi").onclick = increaseInput;
document.querySelector("#rlsm-decrease-phi").onclick = decreaseInput;
document.querySelector("#dlsm-increase-T").onclick = increaseInput;
document.querySelector("#dlsm-decrease-T").onclick = decreaseInput;
document.querySelector("#dlsm-increase-E").onclick = increaseInput;
document.querySelector("#dlsm-decrease-E").onclick = decreaseInput;
document.querySelector("#dlsm-increase-N").onclick = increaseInput;
document.querySelector("#dlsm-decrease-N").onclick = decreaseInput;
document.querySelector("#dlsm-increase-M").onclick = increaseInput;
document.querySelector("#dlsm-decrease-M").onclick = decreaseInput;
document.querySelector("#dlsm-increase-f").onclick = increaseInput;
document.querySelector("#dlsm-decrease-f").onclick = decreaseInput;
document.querySelector("#dlsm-increase-P").onclick = increaseInput;
document.querySelector("#dlsm-decrease-P").onclick = decreaseInput;
document.querySelector("#dlsm-increase-Mbf").onclick = increaseInput;
document.querySelector("#dlsm-decrease-Mbf").onclick = decreaseInput;
document.querySelector("#dlsm-increase-s").onclick = increaseInput;
document.querySelector("#dlsm-decrease-s").onclick = decreaseInput;
document.querySelector("#dlsm-increase-mu").onclick = increaseInput;
document.querySelector("#dlsm-decrease-mu").onclick = decreaseInput;
document.querySelector("#dlsm-increase-phi").onclick = increaseInput;
document.querySelector("#dlsm-decrease-phi").onclick = decreaseInput;
document.querySelector("#osm-increase-T").onclick = increaseInput;
document.querySelector("#osm-decrease-T").onclick = decreaseInput;
document.querySelector("#osm-increase-E").onclick = increaseInput;
document.querySelector("#osm-decrease-E").onclick = decreaseInput;
document.querySelector("#osm-increase-N").onclick = increaseInput;
document.querySelector("#osm-decrease-N").onclick = decreaseInput;
document.querySelector("#osm-increase-M").onclick = increaseInput;
document.querySelector("#osm-decrease-M").onclick = decreaseInput;
document.querySelector("#osm-increase-f").onclick = increaseInput;
document.querySelector("#osm-decrease-f").onclick = decreaseInput;
document.querySelector("#osm-increase-P").onclick = increaseInput;
document.querySelector("#osm-decrease-P").onclick = decreaseInput;
document.querySelector("#osm-increase-Mbf").onclick = increaseInput;
document.querySelector("#osm-decrease-Mbf").onclick = decreaseInput;
document.querySelector("#osm-increase-s").onclick = increaseInput;
document.querySelector("#osm-decrease-s").onclick = decreaseInput;
document.querySelector("#osm-increase-mu").onclick = increaseInput;
document.querySelector("#osm-decrease-mu").onclick = decreaseInput;
document.querySelector("#osm-increase-phi").onclick = increaseInput;
document.querySelector("#osm-decrease-phi").onclick = decreaseInput;

document.querySelector("#osm-increase-num-tired-levels").onclick = increaseInput;
document.querySelector("#osm-decrease-num-tired-levels").onclick = decreaseInput;

document.querySelector("#autoplay-button").onclick = startPlaying;
//document.querySelector("#vlsm-autoplay-button").onclick = startPlaying;
//document.querySelector("#rlsm-autoplay-button").onclick = startPlaying;
//document.querySelector("#dlsm-autoplay-button").onclick = startPlaying;
//document.querySelector("#osm-autoplay-button").onclick = startPlaying;
document.querySelectorAll(".play-class").forEach((btn) => {btn.onclick = buttonChange;});
document.querySelector("#stop-button").onclick = stopPlaying;
/*document.querySelector("#vlsm-stop-button").onclick = stopPlaying;
document.querySelector("#rlsm-stop-button").onclick = stopPlaying;
document.querySelector("#dlsm-stop-button").onclick = stopPlaying;
document.querySelector("#osm-stop-button").onclick = stopPlaying;*/
//document.querySelectorAll(".pause-class").forEach((btn) => {btn.onclick = stopPlaying;});
document.querySelector("#finish-button").onclick = finishProgress;
//document.querySelector("#vlsm-finish-button").onclick = finishProgress;
//document.querySelector("#rlsm-finish-button").onclick = finishProgress;
//document.querySelector("#dlsm-finish-button").onclick = finishProgress;
//document.querySelector("#osm-finish-button").onclick = finishProgress;
document.querySelector("#granularity-increase").onclick = increaseInput;
document.querySelector("#granularity-decrease").onclick = decreaseInput;
//document.querySelector("#static-view").onclick = switchViewType;
//document.querySelector("#dynamic-view").onclick = switchViewType;
//document.querySelector("#adjustable-progress").onclick = clickProgressBar;

document.querySelector("#cmp-input-T").onchange = runCmp;
document.querySelector("#cmp-input-T").onwheel = runCmp;
document.querySelector("#cmp-input-E").onchange = runCmp;
document.querySelector("#cmp-input-E").onwheel = runCmp;
document.querySelector("#cmp-input-N").oninput = changeProgressCapacity;
document.querySelector("#cmp-input-N").onwheel = changeProgressCapacity;
document.querySelector("#adjustable-progress-bar").onchange = runCmp;
document.querySelector("#adjustable-progress-bar").onclick = dragHandler;
document.querySelector("#vlsm-progress-bar").onchange = runCmp;
document.querySelector("#rlsm-progress-bar").onchange = runCmp;
document.querySelector("#dlsm-progress-bar").onchange = runCmp;
document.querySelector("#osm-progress-bar").onchange = runCmp;
document.querySelector("#cmp-input-M").onchange = runCmp;
document.querySelector("#cmp-input-M").onwheel = runCmp;
document.querySelector("#cmp-input-f").onchange = runCmp;
document.querySelector("#cmp-input-f").onwheel = runCmp;
document.querySelector("#cmp-input-P").onchange = runCmp;
document.querySelector("#cmp-input-P").onwheel = runCmp;
document.querySelector("#cmp-input-Mbf").onchange = runCmp;
document.querySelector("#cmp-input-Mbf").onwheel = runCmp;
document.querySelector("#cmp-input-s").onchange = runCmp;
document.querySelector("#cmp-input-s").onwheel = runCmp;
document.querySelector("#cmp-input-mu").onchange = runCmp;
document.querySelector("#cmp-input-mu").onwheel = runCmp;
document.querySelector("#cmp-input-phi").onchange = runCmp;
document.querySelector("#cmp-input-phi").onwheel = runCmp;
document.querySelector("#cmp-leveling").onclick = runCmp;
document.querySelector("#cmp-tiering").onclick = runCmp;
document.querySelector("#cmp-vlsm-leveling").onclick = runCmp;
document.querySelector("#cmp-vlsm-tiering").onclick = runCmp;
// document.querySelector("#cmp-rlsm-leveling").onclick = runCmp;
// document.querySelector("#cmp-rlsm-tiering").onclick = runCmp;
// document.querySelector("#cmp-osm-leveling").onclick = runCmp;
document.querySelector("#cmp-select-M").onchange = runCmp;
document.querySelector("#cmp-select-E").onchange = runCmp;
document.querySelector("#cmp-select-P").onchange = runCmp;
document.querySelector("#cmp-select-Mbf").onchange = runCmp;
document.querySelector("#cmp-bg-merging").onchange = runCmp;
document.querySelector("#cmp-threshold").onchange = runCmp;
//document.querySelector("#granularity-input").onchange = runCmp;
//document.querySelector("#adjustable-progress-bar").onchange = runCmp;
// document.querySelector("#cmp-osm-tiering").onclick = runCmp;
// Individual LSM analysis event trigger
document.querySelector("#vlsm-input-T").onchange = runIndiv;
document.querySelector("#vlsm-input-T").onwheel = runIndiv;
document.querySelector("#vlsm-input-E").onchange = runIndiv;
document.querySelector("#vlsm-input-E").onwheel = runIndiv;
document.querySelector("#vlsm-input-N").onchange = runIndiv;
document.querySelector("#vlsm-input-N").onwheel = runIndiv;
document.querySelector("#vlsm-input-M").onchange = runIndiv;
document.querySelector("#vlsm-input-M").onwheel = runIndiv;
document.querySelector("#vlsm-input-f").onchange = runIndiv;
document.querySelector("#vlsm-input-f").onwheel = runIndiv;
document.querySelector("#vlsm-input-P").onchange = runIndiv;
document.querySelector("#vlsm-input-P").onwheel = runIndiv;
document.querySelector("#vlsm-input-Mbf").onchange = runIndiv;
document.querySelector("#vlsm-input-Mbf").onwheel = runIndiv;
document.querySelector("#vlsm-input-s").onchange = runIndiv;
document.querySelector("#vlsm-input-s").onwheel = runIndiv;
document.querySelector("#vlsm-input-mu").onchange = runIndiv;
document.querySelector("#vlsm-input-mu").onwheel = runIndiv;
document.querySelector("#vlsm-input-phi").onchange = runIndiv;
document.querySelector("#vlsm-input-phi").onwheel = runIndiv;
document.querySelector("#vlsm-tiering").onclick = runIndiv;
document.querySelector("#vlsm-leveling").onclick = runIndiv;
document.querySelector("#vlsm-select-M").onchange = runIndiv;
document.querySelector("#vlsm-select-E").onchange = runIndiv;
document.querySelector("#vlsm-select-P").onchange = runIndiv;
document.querySelector("#vlsm-select-Mbf").onchange = runIndiv;
document.querySelector("#rlsm-input-T").onchange = runIndiv
document.querySelector("#rlsm-input-T").onwheel = runIndiv;
document.querySelector("#rlsm-input-E").onchange = runIndiv;
document.querySelector("#rlsm-input-E").onwheel = runIndiv;
document.querySelector("#rlsm-input-N").onchange = runIndiv;
document.querySelector("#rlsm-input-N").onwheel = runIndiv;
document.querySelector("#rlsm-input-M").onchange = runIndiv;
document.querySelector("#rlsm-input-M").onwheel = runIndiv;
document.querySelector("#rlsm-input-f").onchange = runIndiv;
document.querySelector("#rlsm-input-f").onwheel = runIndiv;
document.querySelector("#rlsm-input-P").onchange = runIndiv;
document.querySelector("#rlsm-input-P").onwheel = runIndiv;
document.querySelector("#rlsm-input-Mbf").onchange = runIndiv;
document.querySelector("#rlsm-input-Mbf").onwheel = runIndiv;
document.querySelector("#rlsm-input-s").onchange = runIndiv;
document.querySelector("#rlsm-input-s").onwheel = runIndiv;
document.querySelector("#rlsm-input-mu").onchange = runIndiv;
document.querySelector("#rlsm-input-mu").onwheel = runIndiv;
document.querySelector("#rlsm-input-phi").onchange = runIndiv;
document.querySelector("#rlsm-input-phi").onwheel = runIndiv;
// document.querySelector("#rlsm-tiering").onclick = runIndiv;
document.querySelector("#rlsm-leveling").onclick = runIndiv;
document.querySelector("#rlsm-select-M").onchange = runIndiv;
document.querySelector("#rlsm-select-E").onchange = runIndiv;
document.querySelector("#rlsm-select-P").onchange = runIndiv;
document.querySelector("#rlsm-select-Mbf").onchange = runIndiv;
document.querySelector("#rlsm-threshold").onchange = runIndiv;
document.querySelector("#dlsm-input-T").onchange = runIndiv
document.querySelector("#dlsm-input-T").onwheel = runIndiv;
document.querySelector("#dlsm-input-E").onchange = runIndiv;
document.querySelector("#dlsm-input-E").onwheel = runIndiv;
document.querySelector("#dlsm-input-N").onchange = runIndiv;
document.querySelector("#dlsm-input-N").onwheel = runIndiv;
document.querySelector("#dlsm-input-M").onchange = runIndiv;
document.querySelector("#dlsm-input-M").onwheel = runIndiv;
document.querySelector("#dlsm-input-f").onchange = runIndiv;
document.querySelector("#dlsm-input-f").onwheel = runIndiv;
document.querySelector("#dlsm-input-P").onchange = runIndiv;
document.querySelector("#dlsm-input-P").onwheel = runIndiv;
document.querySelector("#dlsm-input-Mbf").onchange = runIndiv;
document.querySelector("#dlsm-input-Mbf").onwheel = runIndiv;
document.querySelector("#dlsm-input-s").onchange = runIndiv;
document.querySelector("#dlsm-input-s").onwheel = runIndiv;
document.querySelector("#dlsm-input-mu").onchange = runIndiv;
document.querySelector("#dlsm-input-mu").onwheel = runIndiv;
document.querySelector("#dlsm-input-phi").onchange = runIndiv;
document.querySelector("#dlsm-input-phi").onwheel = runIndiv;
document.querySelector("#dlsm-select-M").onchange = runIndiv;
document.querySelector("#dlsm-select-E").onchange = runIndiv;
document.querySelector("#dlsm-select-P").onchange = runIndiv;
document.querySelector("#dlsm-select-Mbf").onchange = runIndiv;
document.querySelector("#osm-input-T").onchange = runIndiv
document.querySelector("#osm-input-T").onwheel = runIndiv;
document.querySelector("#osm-input-E").onchange = runIndiv;
document.querySelector("#osm-input-E").onwheel = runIndiv;
document.querySelector("#osm-input-N").onchange = runIndiv;
document.querySelector("#osm-input-N").onwheel = runIndiv;
document.querySelector("#osm-input-M").onchange = runIndiv;
document.querySelector("#osm-input-M").onwheel = runIndiv;
document.querySelector("#osm-input-f").onchange = runIndiv;
document.querySelector("#osm-input-f").onwheel = runIndiv;
document.querySelector("#osm-input-P").onchange = runIndiv;
document.querySelector("#osm-input-P").onwheel = runIndiv;
document.querySelector("#osm-input-Mbf").onchange = runIndiv;
document.querySelector("#osm-input-Mbf").onwheel = runIndiv;
document.querySelector("#osm-input-s").onchange = runIndiv;
document.querySelector("#osm-input-s").onwheel = runIndiv;
document.querySelector("#osm-input-mu").onchange = runIndiv;
document.querySelector("#osm-input-mu").onwheel = runIndiv;
document.querySelector("#osm-input-phi").onchange = runIndiv;
document.querySelector("#osm-input-phi").onwheel = runIndiv;
// document.querySelector("#osm-tiering").onlick = runIndiv;
// document.querySelector("#osm-leveling").onclick = runIndiv;
document.querySelector("#osm-select-M").onchange = runIndiv;
document.querySelector("#osm-select-E").onchange = runIndiv;
document.querySelector("#osm-select-P").onchange = runIndiv;
document.querySelector("#osm-select-Mbf").onchange = runIndiv;

document.querySelector("#show-stats-btn").onclick = function(){
  $("#show-stats-btn").hide();
  $("#cost-result").show();

  $("#show-plot-btn").show();
  $("#plot-result").hide();
  runPlots();
}
document.querySelector("#show-plot-btn").onclick = function(){
  $("#show-stats-btn").show();
  $("#cost-result").hide();

  $("#show-plot-btn").hide();
  $("#plot-result").show();
  runPlots();
}

});
