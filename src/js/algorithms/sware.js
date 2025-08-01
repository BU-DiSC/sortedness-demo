/* 
 * One step of the SWARE algorithm
 */

function sware() {
    //console.log(JSON.parse(JSON.stringify(buffer)));
    document.getElementById("tree-area-step-3+").classList.remove("hidden");
    // state == 0 -> Buffer is full, flushing time
    console.log(JSON.parse(JSON.stringify(sware_bulk_loads_history)));
    if (state === 0) {
        if (wait-- == 0) {
            document.getElementById("tree-area-step-3+").classList.remove("hidden");// can show the index now
        }
        // If the buffer is not full, stop the animation, there should be an issue
        if (buffer.length != 10) {
            running = false; // stop the animation
        }
        // If the buffer is full, flush the buffer
        else {
            //console.log('zones: ',JSON.parse(JSON.stringify(zones)));  
            const lastTreeElement = document.getElementById("right-leaf-3"); // get the last tree element
            const swareTriangle = document.getElementById("root"); //root of tree
            // If the last sorted index is -1, only one element sorted
            //console.log(JSON.parse(JSON.stringify(buffer_dict)));
            if (lastSortedIndex == -1) {
                for(let i = 0;i<buffer[0].length;i++)
                {
                    tree.push(buffer[0][i]); // add the first element to the tree
                }
                // Bulk load
                if (buffer_dict[0][0] > sware_max_tree) {
                    //swareTriangle.classList.remove("turn-red");
                    //console.log("bulk load:"+buffer[bufferIndex]+"max: "+ sware_max_tree);
                    sware_max_tree = buffer_dict[0][1]; // max value of page
                    for(let i = 0;i<10;i++)
                    {
                        sware_bulk_loads++;
                        sware_bulk_loads_history.push(sware_bulk_loads);
                        sware_top_inserts_history.push(sware_top_inserts);
                    }
                    if(zones.length<9)
                        lastTreeElement.innerHTML = "(... , " + sware_max_tree + ")";
                    else
                        labelZones();
                    lastTreeElement.classList.add("glow-green");
                    var tempBuffer = buffer[bufferIndex];
                    tempBuffer.sort((a,b)=>a-b); //sort buffer before you bulk load
                    //console.log("bulk load:"+buffer[0]);
                    zones.push(tempBuffer);
                    setTimeout(() => {
                        lastTreeElement.classList.remove('glow-green');
                    }, delay*0.3);
                    state = 1;
                    buffer.shift();
                    sware_flushes++;
                    bufferIndex2 = 0; // Reset the index
                    update_colors();  // Update UI
                    return;
                }
                // Top insert
                else {
                    branch = findBranch();
                    //console.log("test");
                    swareTriangle.classList.add("glow-red");
                    swareTriangle.innerHTML = buffer[0][bufferIndex2];
                    // Map branches 0-8 to visual branches (left=0-2, center=3-5, right=6-8)
                    if(branch >= 0 && branch <= 2) {
                        var connectLine1 = document.getElementById("line-left-1");  
                        var leafIndex = branch; // 0, 1, or 2
                        var connectLine2 = document.getElementById("line-left-to-leaf" + (leafIndex + 1));
                        var leaf = document.getElementById("left-leaf-" + (leafIndex + 1));
                    }
                    else if(branch >= 3 && branch <= 5) {
                        var connectLine1 = document.getElementById("line-center-1");  
                        var leafIndex = branch - 3; // 0, 1, or 2
                        var connectLine2 = document.getElementById("line-center-to-leaf" + (leafIndex + 1));
                        var leaf = document.getElementById("center-leaf-" + (leafIndex + 1));
                    }
                    else { // branch >= 6 && branch <= 8
                        var connectLine1 = document.getElementById("line-right-1");  
                        var leafIndex = branch - 6; // 0, 1, or 2
                        var connectLine2 = document.getElementById("line-right-to-leaf" + (leafIndex + 1));
                        var leaf = document.getElementById("right-leaf-" + (leafIndex + 1));
                    }
                    //console.log("branch"+branch);
                    if(zones.length>=9)
                        labelZones();
                    setTimeout(() => {
                        connectLine1.classList.add("glow-red");
                        connectLine2.classList.add("glow-red");
                        //dots.classList.add("glow-red");
                        setTimeout(()=>{
                            leaf.classList.add("glow-red");
                            setTimeout(()=>{
                                swareTriangle.classList.remove('glow-red');
                                connectLine1.classList.remove("glow-red");
                                connectLine2.classList.remove("glow-red");
                                //dots.classList.remove("glow-red");
                                leaf.classList.remove("glow-red");
                            },delay*0.3);
                        },delay*0.3);
                    }, delay*0.3);
                    // Trigger the glow effect (top insert)
                    sware_top_inserts++; 
                    sware_top_inserts_history.push(sware_top_inserts);
                    sware_bulk_loads_history.push(sware_bulk_loads);
                }
                //console.log(buffer[0][bufferIndex2]);
                tree.push(buffer[0][bufferIndex2]);
                if(buffer[0][bufferIndex2]>sware_max_tree)
                {
                    sware_max_tree = buffer[0][bufferIndex2];
                }
                bufferIndex2++;
                if(bufferIndex2==10)
                {
                    sware_flushes++;
                    state = 1;
                    buffer.shift();
                    bufferIndex2=0;
                }
                // Remove the first element from the buffer
            }
            // If last sorted index is less than 5
            else if (lastSortedIndex < 5) {
                // Update the tree
                //tree.push(buffer[bufferIndex][bufferIndex2]);
                // Bulk load
                if (buffer_dict[bufferIndex][0] > sware_max_tree) {
                    var tempBuffer = buffer[bufferIndex];
                    tempBuffer.sort((a,b)=>a-b);
                    //console.log("bulk load:"+buffer[0]);
                    zones.push(tempBuffer);
                    for(let i = 0;i<buffer[0].length;i++)
                    {
                        tree.push(buffer[bufferIndex][i]); // add the first element to the tree
                    }
                    //console.log("bulk load:"+buffer[bufferIndex]+"max: "+ sware_max_tree);
                    sware_max_tree = buffer_dict[bufferIndex][1];
                    for(let i = 0;i<10;i++)
                    {
                        sware_bulk_loads++;
                        sware_bulk_loads_history.push(sware_bulk_loads);
                        sware_top_inserts_history.push(sware_top_inserts);
                    }
                    if(zones.length<9)
                        lastTreeElement.innerHTML = "(... , " + sware_max_tree + ")";
                    else
                        labelZones();
                    lastTreeElement.classList.add("glow-green");
                    //console.log("bulk load:"+buffer[bufferIndex]);
                    setTimeout(() => {
                        lastTreeElement.classList.remove('glow-green');
                    }, delay*0.3);
                    bufferIndex++;
                    bufferIndex2 = 0;
                    if(bufferIndex==lastSortedIndex+1)
                    {
                        sware_flushes++;
                        bufferIndex = 0;
                        bufferIndex2 = 0
                        buffer.splice(0, lastSortedIndex + 1);
                        state=1;
                        //console.log("break");
                        return;
                    }
                }
                // Top insert
                else {
                    branch = findBranch();
                    //console.log("test");

                    sware_top_inserts++; // increment the number of top inserts
                    sware_top_inserts_history.push(sware_top_inserts);
                    sware_bulk_loads_history.push(sware_bulk_loads);
                    // Trigger the glow effect (top insert)
                    swareTriangle.classList.add("glow-red");
                    swareTriangle.innerHTML = buffer[bufferIndex][bufferIndex2];
                    //console.log(buffer[bufferIndex][bufferIndex2]);
                    //determine which branch to light up
                    // Map branches 0-8 to visual branches (left=0-2, center=3-5, right=6-8)
                    if(branch >= 0 && branch <= 2) {
                        var connectLine1 = document.getElementById("line-left-1");  
                        var leafIndex = branch; // 0, 1, or 2
                        var connectLine2 = document.getElementById("line-left-to-leaf" + (leafIndex + 1));
                        var leaf = document.getElementById("left-leaf-" + (leafIndex + 1));
                    }
                    else if(branch >= 3 && branch <= 5) {
                        var connectLine1 = document.getElementById("line-center-1");  
                        var leafIndex = branch - 3; // 0, 1, or 2
                        var connectLine2 = document.getElementById("line-center-to-leaf" + (leafIndex + 1));
                        var leaf = document.getElementById("center-leaf-" + (leafIndex + 1));
                    }
                    else { // branch >= 6 && branch <= 8
                        var connectLine1 = document.getElementById("line-right-1");  
                        var leafIndex = branch - 6; // 0, 1, or 2
                        var connectLine2 = document.getElementById("line-right-to-leaf" + (leafIndex + 1));
                        var leaf = document.getElementById("right-leaf-" + (leafIndex + 1));
                    }
                    //console.log("branch"+branch);
                    if(zones.length>=9)
                        labelZones();
                    setTimeout(() => {
                        connectLine1.classList.add("glow-red");
                        connectLine2.classList.add("glow-red");
                        //dots.classList.add("glow-red");
                        setTimeout(()=>{
                            leaf.classList.add("glow-red");
                            setTimeout(()=>{
                                swareTriangle.classList.remove('glow-red');
                                connectLine1.classList.remove("glow-red");
                                connectLine2.classList.remove("glow-red");
                                //dots.classList.remove("glow-red");
                                leaf.classList.remove("glow-red");
                            },delay*0.3);
                        },delay*0.3);
                    }, delay*0.3);
                    const circle = document.getElementById('circle');
                    tree.push(buffer[bufferIndex][bufferIndex2]);
                    if(buffer[bufferIndex][bufferIndex2]>sware_max_tree)
                    {
                        sware_max_tree = buffer[bufferIndex][bufferIndex2];
                    }
                    bufferIndex2++;
                    if(bufferIndex2==10)
                    {
                        bufferIndex++;
                        bufferIndex2=0;
                    }
                }
                if(bufferIndex==lastSortedIndex+1)
                {
                    sware_flushes++;
                    bufferIndex = 0;
                    bufferIndex2 = 0
                    buffer.splice(0, lastSortedIndex + 1);
                    state=1;
                    //console.log("break2");
                    return;
                }
            }
            // If last sorted index is greater than 5
            else {
                stop_zones = false;
                // Update the tree
                //tree.push(buffer[bufferIndex]);
                // Bulk load
                if (buffer_dict[bufferIndex][0] > sware_max_tree) {
                    for(let i = 0;i<buffer[0].length;i++)
                    {
                        tree.push(buffer[bufferIndex][i]);
                    }
                    var tempBuffer = buffer[bufferIndex];
                    tempBuffer.sort((a,b)=>a-b);
                    //console.log("bulk load:"+buffer[0]);
                    zones.push(tempBuffer);
                    //console.log("bulk load:"+buffer[bufferIndex]+"max: "+ sware_max_tree);
                    sware_max_tree = buffer_dict[bufferIndex][1];
                    for(let i = 0;i<10;i++)
                    {
                        sware_bulk_loads++;
                        sware_bulk_loads_history.push(sware_bulk_loads);
                        sware_top_inserts_history.push(sware_top_inserts);
                    }
                    if(zones.length<9)
                        lastTreeElement.innerHTML = "(... , " + sware_max_tree + ")";
                    else
                        labelZones();
                    lastTreeElement.classList.add("glow-green");
                    //console.log("bulk load:"+buffer[bufferIndex]);
                    setTimeout(() => {
                        lastTreeElement.classList.remove('glow-green');
                    }, delay*0.3);
                    bufferIndex++;
                    bufferIndex2 = 0;
                    if(bufferIndex==lastSortedIndex+1)
                    {
                        sware_flushes++;
                        bufferIndex = 0;
                        bufferIndex2 = 0
                        buffer.splice(0, lastSortedIndex + 1);
                        state=1;
                        //console.log("break");
                        return;
                    }
                }
                // Top insert
                else {
                    branch = findBranch();
                    //console.log("test");

                    sware_top_inserts++; // increment the number of top inserts
                    sware_top_inserts_history.push(sware_top_inserts);
                    sware_bulk_loads_history.push(sware_bulk_loads);
                    // Trigger the glow effect (top insert)
                    const circle = document.getElementById('circle');
                    swareTriangle.classList.add("glow-red");
                    swareTriangle.innerHTML = buffer[bufferIndex][bufferIndex2];
                    //console.log(buffer[bufferIndex][bufferIndex2]);
                    //console.log("branch"+branch);
                    // Map branches 0-8 to visual branches (left=0-2, center=3-5, right=6-8)
                    if(branch >= 0 && branch <= 2) {
                        var connectLine1 = document.getElementById("line-left-1");  
                        var leafIndex = branch; // 0, 1, or 2
                        var connectLine2 = document.getElementById("line-left-to-leaf" + (leafIndex + 1));
                        var leaf = document.getElementById("left-leaf-" + (leafIndex + 1));
                    }
                    else if(branch >= 3 && branch <= 5) {
                        var connectLine1 = document.getElementById("line-center-1");  
                        var leafIndex = branch - 3; // 0, 1, or 2
                        var connectLine2 = document.getElementById("line-center-to-leaf" + (leafIndex + 1));
                        var leaf = document.getElementById("center-leaf-" + (leafIndex + 1));
                    }
                    else { // branch >= 6 && branch <= 8
                        var connectLine1 = document.getElementById("line-right-1");  
                        var leafIndex = branch - 6; // 0, 1, or 2
                        var connectLine2 = document.getElementById("line-right-to-leaf" + (leafIndex + 1));
                        var leaf = document.getElementById("right-leaf-" + (leafIndex + 1));
                    }
                    //console.log("branch"+branch);
                    if(zones.length>=9)
                        labelZones();
                    setTimeout(() => {
                        connectLine1.classList.add("glow-red");
                        connectLine2.classList.add("glow-red");
                        //dots.classList.add("glow-red");
                        setTimeout(()=>{
                            leaf.classList.add("glow-red");
                            setTimeout(()=>{
                                swareTriangle.classList.remove('glow-red');
                                connectLine1.classList.remove("glow-red");
                                connectLine2.classList.remove("glow-red");
                                //dots.classList.remove("glow-red");
                                leaf.classList.remove("glow-red");
                            },delay*0.3);
                        },delay*0.3);
                    }, delay*0.3);
                    tree.push(buffer[bufferIndex][bufferIndex2]);
                    if(buffer[bufferIndex][bufferIndex2]>sware_max_tree)
                    {
                        sware_max_tree = buffer[bufferIndex][bufferIndex2];
                    }
                    bufferIndex2++;
                    if(bufferIndex2==10)
                    {
                        bufferIndex++;
                        bufferIndex2=0;
                    }
                }
                if(bufferIndex==5)
                {
                    sware_flushes++;
                    buffer.splice(0, 5);
                    bufferIndex = 0;
                    bufferIndex2 = 0
                    state=1;
                    //console.log("break2");
                    return;
                }
            } 
            // Calculate average pages per flush
            sware_average_pages_per_flush = (tree.length) / sware_flushes;
            
        }
        update_colors(); // update colors of the buffer
        // go to next state
    }
    // state == 1 -> Sorting time
    else if (state == 1) {

        // Get the remaining pages
        //let remaining_pages = [];
        //for (let i = 0; i < buffer.length; i++) {
        //    remaining_pages = remaining_pages.concat(zones_dict[buffer[i][1]]);
        //}
        sortBufferData.length=0;
        buffer_dict.length = 0;
        //break appart all pages and buffer and sort to make sure fully sorted
        for(let i = 0;i<buffer.length;i++)
        {
            for(let j = 0;j<buffer[0].length;j++)
            {
                sortBufferData.push(buffer[i][j]);
            }
        }
        sortBufferData.sort((a, b) => a - b);
        buffer.length = 0;
         // Partition the data    
        for (let i = 0; i < sortBufferData.length; i += 10) {
            const part = sortBufferData.slice(i, i + 10);
            buffer.push(part);
        }
        for (let i = 0; i < buffer.length; i += 1) {
            const min = Math.min(...buffer[i]);
            const max = Math.max(...buffer[i]);
            buffer_dict.push([min, max]);
        }
        sware_sorts++; // increment the number of sorts
        //partitioned_data = []; // reset the partitioned data
        //buffer = []; // reset the buffer
        // Partition the remaining pages
        //for (let i = 0; i < remaining_pages.length; i += 10) {
        //    const part = remaining_pages.slice(i, i + 10);
        //    partitioned_data.push(part);
       // }
        // Add the min max of each partition to the buffer
        //for (let i = 0; i < partitioned_data.length; i += 1) {
        //    const min = Math.min(...partitioned_data[i]);
        //    const max = Math.max(...partitioned_data[i]);
        //    buffer.push([min, max]);
        //    zones_dict[max] = partitioned_data[i]; // keep track of the zones
        //}

        // Update sware parameters
        lastSortedIndex = buffer.length - 1; // last sorted index
        amount_of_buffer_flushed = buffer.length-1;
        numInsideBuffer = buffer.length; // number of elements inside the buffer
        //sware_max_tree = buffer[buffer.length-1][1]; // max value of the buffer

        update_colors(); // update colors of the buffer
        sware_max_buffer = buffer[lastSortedIndex];
        
        state = 2; // go to next state
    }
    // state == 2 -> Buffer is empty, fill the buffer
    else if (state == 2) {
        // If zones is not empty
        while (sware_data.length != 0) {
            // when the buffer is full, break
            if (numInsideBuffer == 10) {
                overlapperSet = false; // reset the overlapper set
                sware_buffer_sorted = true;
                break;
            }
            // If the buffer is not full, fill the buffer
            else {
                var el = sware_data.shift(); // get the next element from zones list
                buffer.push(el); // add the element to the buffer
                numInsideBuffer++; // increment the number of elements inside the buffer
                // If the element is greater than the global max, increment the lastSortedIndex
                if ((zones_dict[0][0] >= sware_max_buffer) && (moved == false)&&sware_buffer_sorted == true) {
                    lastSortedIndex++; // increment the last sorted index
                    amount_of_buffer_flushed++;
                    sware_max_buffer = zones_dict[0][1]; // update the global max
                }
                // Push lastSortedIndex back to its position
                else {
                    // If the overlapper is not set, set it (only for visual purposes)
                    if (!overlapperSet) {
                        overlapper = numInsideBuffer - 1;
                        overlapperSet = true;
                    }
                    sware_buffer_sorted=false;
                    // Travers down the buffer
                    for (let i = lastSortedIndex; i >= 0; i--) {
                        // Edge case: lastSortedIndex is 0
                        if (i == 0) {
                            // If the current element causes overlap
                            if (zones_dict[0][0]<buffer_dict[i][1]) {
                                // Move lastSortedIndex back
                                lastSortedIndex = i - 1;
                                moved = true;
                                break;
                            }
                        }
                        // All other cases
                        else {
                            // If the current element causes overlap
                            if (zones_dict[0][0]<buffer_dict[i][1]) {
                                // Move lastSortedIndex back
                                lastSortedIndex = i - 1;
                                moved = true;
                                break;
                            }
                        }
                    }
                }
                buffer_dict.push(zones_dict[0]);
                zones_dict.shift();
            }
        }

        update_colors(); // update colors of the buffer
        bufferIndex = 0;
        bufferIndex2 = 0;
        state = 0; // go to next state

    }
}


function findBranch()
{
    console.log(JSON.parse(JSON.stringify(zones)));
    console.log(buffer[bufferIndex][bufferIndex2]);
    stop_zones = false;
    for(let i = 0;i<zones.length&&!stop_zones;i++)
    {
        //if its first entry need to check if values is less than all previous values
        if(i==0)
        {
            if(buffer[bufferIndex][bufferIndex2]<=zones[i][0])
            {
                //console.log("not working test");
                stop_zones = true;//if acceptable part of zones can take the value stop loop 
                if(zones[i].length<leaf_node_size)
                {
                    zones[i].push(buffer[bufferIndex][bufferIndex2]);
                    zones[i].sort((a,b)=>a-b);
                }
                else{//split leaf
                    let tempZone = [...zones[i]];
                    firstPart = tempZone.slice(0,8);
                    secondPart = tempZone.slice(8);
                    zones.splice(i,1,firstPart,secondPart);
                    if(buffer[bufferIndex][bufferIndex2]>zones[i+1][0])
                    {
                        i++;
                        zones[i].push(buffer[bufferIndex][bufferIndex2]);
                        zones[i].sort((a,b)=>a-b);
                    }
                    else
                    {
                        zones[i].push(buffer[bufferIndex][bufferIndex2]);
                        zones[i].sort((a,b)=>a-b);
                    }
                }
                // Determine which ninth of zones this is
                if(i < zones.length/9)
                    branch = 0;
                else if(i < 2*zones.length/9)
                    branch = 1;
                else if(i < 3*zones.length/9)
                    branch = 2;
                else if(i < 4*zones.length/9)
                    branch = 3;
                else if(i < 5*zones.length/9)
                    branch = 4;
                else if(i < 6*zones.length/9)
                    branch = 5;
                else if(i < 7*zones.length/9)
                    branch = 6;
                else if(i < 8*zones.length/9)
                    branch = 7;
                else
                    branch = 8;

            }
        }
        //check if value is between branches
        if(i<zones.length-1&&buffer[bufferIndex][bufferIndex2]>zones[i][0]&&buffer[bufferIndex][bufferIndex2]<zones[i+1][0])
        {
            stop_zones = true;
            if(zones[i].length<leaf_node_size)
            {
                zones[i].push(buffer[bufferIndex][bufferIndex2]);
                zones[i].sort((a,b)=>a-b);
            }
            else{//split leaf
                let tempZone = [...zones[i]];
                firstPart = tempZone.slice(0,8);
                secondPart = tempZone.slice(8);
                zones.splice(i,1,firstPart,secondPart);
                if(buffer[bufferIndex][bufferIndex2]>zones[i+1][0])
                {
                    i++;
                    zones[i].push(buffer[bufferIndex][bufferIndex2]);
                    zones[i].sort((a,b)=>a-b);
                }
                else{
                    zones[i].push(buffer[bufferIndex][bufferIndex2]);
                    zones[i].sort((a,b)=>a-b);
                }
            }
            // Determine which ninth of zones this is
            if(i < zones.length/9)
                branch = 0;
            else if(i < 2*zones.length/9)
                branch = 1;
            else if(i < 3*zones.length/9)
                branch = 2;
            else if(i < 4*zones.length/9)
                branch = 3;
            else if(i < 5*zones.length/9)
                branch = 4;
            else if(i < 6*zones.length/9)
                branch = 5;
            else if(i < 7*zones.length/9)
                branch = 6;
            else if(i < 8*zones.length/9)
                branch = 7;
            else
                branch = 8;
        }
        //check if value is greater than all other branches
        if(i==zones.length-1)
        {
            stop_zones = true;
            if(zones[i].length<leaf_node_size)
            {
                zones[i].push(buffer[bufferIndex][bufferIndex2]);
                zones[i].sort((a,b)=>a-b);
            }
            else{//split leaf
                let tempZone = [...zones[i]];
                firstPart = tempZone.slice(0,8);
                secondPart = tempZone.slice(8);
                
                zones.splice(i,1,firstPart,secondPart);
                if(buffer[bufferIndex][bufferIndex2]>zones[i+1][0])
                {
                    i++;
                    zones[i].push(buffer[bufferIndex][bufferIndex2]);
                    zones[i].sort((a,b)=>a-b);
                }
                else{
                    zones[i].push(buffer[bufferIndex][bufferIndex2]);
                    zones[i].sort((a,b)=>a-b);
                }
            }
            // Determine which ninth of zones this is
            if(i < zones.length/9)
                branch = 0;
            else if(i < 2*zones.length/9)
                branch = 1;
            else if(i < 3*zones.length/9)
                branch = 2;
            else if(i < 4*zones.length/9)
                branch = 3;
            else if(i < 5*zones.length/9)
                branch = 4;
            else if(i < 6*zones.length/9)
                branch = 5;
            else if(i < 7*zones.length/9)
                branch = 6;
            else if(i < 8*zones.length/9)
                branch = 7;
            else
                branch = 8;
        }
    }
    
    return branch;
}


function labelZones()
{
    let leafId = 0;
    let leaf_dict = [];
    let minTemp;
    let maxTemp;
    for(let i = 0;i<zones.length;i++)
    {
        if(i==0)
        {
            minTemp = zones[0][0];
        }
        if(i>=(leafId+1)*zones.length/9)
        {
            leaf_dict.push([minTemp,maxTemp]);
            leafId++;
            minTemp = zones[i][0];
        }
        maxTemp = zones[i][zones[i].length-1];
    }
    leaf_dict.push([minTemp,sware_max_tree]);
    //console.log(leaf_dict);
    for(let i = 0;i<9;i++)
    {
        if(i/3<1){
            document.getElementById("left-leaf-"+(i%3+1)).innerHTML = "("+leaf_dict[i][0]+','+leaf_dict[i][1]+')';
        }
        else if(i/3<2){
            document.getElementById("center-leaf-"+(i%3+1)).innerHTML = "("+leaf_dict[i][0]+','+leaf_dict[i][1]+')';
        }
        else{
            document.getElementById("right-leaf-"+(i%3+1)).innerHTML = "("+leaf_dict[i][0]+','+leaf_dict[i][1]+')';
        }
    }


}