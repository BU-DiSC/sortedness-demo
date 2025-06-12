
/* 
 * One step of the SWARE algorithm
 */

function sware() {

    // state == 0 -> Buffer is full, flushing time
    if (state === 0) {
        if (wait-- == 0) {
            document.getElementById("tree-area-step-3+").classList.remove("hidden"); // can show the index now
        }
        // If the buffer is not full, stop the animation, there should be an issue
        if (buffer.length != 10) {
            running = false; // stop the animation
        }
        // If the buffer is full, flush the buffer
        else {
            sware_flushes++; // increment the number of flushes
            // If the last sorted index is -1, only one element sorted
            if (lastSortedIndex == -1) {
                tree.push(buffer[0]); // add the first element to the tree
                const lastTreeElement = document.getElementById("last-tree"); // get the last tree element
                // Bulk load
                if (buffer[0][1] > sware_max_tree) {
                    sware_max_tree = buffer[0][1];
                    lastTreeElement.innerHTML = "(... , " + sware_max_tree + ")";
                    sware_bulk_loads++;
                }
                // Top insert
                else {
                    // Trigger the glow effect (top insert)
                    sware_top_inserts++;
                    const circle = document.getElementById('circle');
                    circle.classList.add('glow-active');
                        
                    setTimeout(() => {
                        circle.classList.remove('glow-active');
                    }, 300);      

                }
                // Remove the first element from the buffer
                buffer.shift();
            }
            // If last sorted index is less than 5
            else if (lastSortedIndex < 5) {
                // Update the tree
                for (let j = 0; j <= lastSortedIndex; j++) {
                    tree.push(buffer[j]);
                }
                const lastTreeElement = document.getElementById("last-tree");
                // Bulk load
                if (buffer[lastSortedIndex][1] > sware_max_tree) {
                    sware_max_tree = buffer[lastSortedIndex][1];
                    lastTreeElement.innerHTML = "(... , " + sware_max_tree + ")";
                    sware_bulk_loads++;
                }
                // Top insert
                else {
                    sware_top_inserts++; // increment the number of top inserts
                    // Trigger the glow effect (top insert)
                    const circle = document.getElementById('circle');
                    circle.classList.add('glow-active');
                    
                    setTimeout(() => {
                        circle.classList.remove('glow-active');
                    }, 300);
                }
                buffer.splice(0, lastSortedIndex + 1);
            }
            // If last sorted index is greater than 5
            else {
                // Update the tree
                for (let j = 0; j < 5; j++) {
                    tree.push(buffer[j]);
                }
                const lastTreeElement = document.getElementById("last-tree");
                // Bulk load
                if (buffer[lastSortedIndex][1] > sware_max_tree) {
                    sware_max_tree = buffer[lastSortedIndex][1];
                    lastTreeElement.innerHTML = "(... , " + sware_max_tree + ")";
                    sware_bulk_loads++;
                }
                // Top insert
                else {
                    sware_top_inserts++; // increment the number of top inserts
                    // Trigger the glow effect (top insert)
                    const circle = document.getElementById('circle');
                    circle.classList.add('glow-active');
                    
                    setTimeout(() => {
                        circle.classList.remove('glow-active');
                    }, 300);
                }
                buffer.splice(0, 5);
            } 
            // Calculate average pages per flush
            sware_average_pages_per_flush = (tree.length * 10) / sware_flushes;
            
        }
        update_colors(); // update colors of the buffer
       
        state = 1; // go to next state
    }
    // state == 1 -> Sorting time
    else if (state == 1) {

        // Get the remaining pages
        let remaining_pages = [];
        for (let i = 0; i < buffer.length; i++) {
            remaining_pages = remaining_pages.concat(zones_dict[buffer[i][1]]);
        }
        remaining_pages.sort((a, b) => a - b);
        sware_sorts++; // increment the number of sorts
        partitioned_data = []; // reset the partitioned data
        buffer = []; // reset the buffer
        // Partition the remaining pages
        for (let i = 0; i < remaining_pages.length; i += 10) {
            const part = remaining_pages.slice(i, i + 10);
            partitioned_data.push(part);
        }
        // Add the min max of each partition to the buffer
        for (let i = 0; i < partitioned_data.length; i += 1) {
            const min = Math.min(...partitioned_data[i]);
            const max = Math.max(...partitioned_data[i]);
            buffer.push([min, max]);
            zones_dict[max] = partitioned_data[i]; // keep track of the zones
        }

        // Update sware parameters
        lastSortedIndex = buffer.length - 1; // last sorted index
        numInsideBuffer = buffer.length; // number of elements inside the buffer
        sware_max_tree = buffer[buffer.length-1][1]; // max value of the buffer

        update_colors(); // update colors of the buffer

        
        state = 2; // go to next state
    }
    // state == 2 -> Buffer is empty, fill the buffer
    else if (state == 2) {
        // If zones is not empty
        while (zones.length != 0) {
            // when the buffer is full, break
            if (numInsideBuffer == 10) {
                overlapperSet = false; // reset the overlapper set
                break;
            }
            // If the buffer is not full, fill the buffer
            else {
                var el = zones.shift(); // get the next element from zones list
                buffer.push(el); // add the element to the buffer
                numInsideBuffer++; // increment the number of elements inside the buffer
                // If the element is greater than the global max, increment the lastSortedIndex
                if ((el[0] > sware_max_buffer) && (moved == false)) {
                    lastSortedIndex++; // increment the last sorted index
                    sware_max_buffer = el[1]; // update the global max
                }
                // Push lastSortedIndex back to its position
                else {
                    // If the overlapper is not set, set it (only for visual purposes)
                    if (!overlapperSet) {
                        overlapper = numInsideBuffer - 1;
                        overlapperSet = true;
                    }
                    // Travers down the buffer
                    for (let i = lastSortedIndex; i >= 0; i--) {
                        // Edge case: lastSortedIndex is 0
                        if (i == 0) {
                            // If the current element causes overlap
                            if ((el[0] > buffer[i][0] && el[0] < buffer[i][1]) || (el[0] < buffer[i][0])) {
                                // Move lastSortedIndex back
                                sware_max_buffer = buffer[i][1];
                                lastSortedIndex = i - 1;
                                moved = true;
                                break;
                            }
                        }
                        // All other cases
                        else {
                            // If the current element causes overlap
                            if ((el[0] > buffer[i][0] && el[0] < buffer[i][1]) 
                                || (el[0] < buffer[i][0] && el[0] > buffer[i-1][1])) {
                                // Move lastSortedIndex back
                                sware_max_buffer = buffer[i][1];
                                lastSortedIndex = i - 1;
                                moved = true;
                                break;
                            }
                        }
                    }
                }
            }
        }

        update_colors(); // update colors of the buffer

        state = 0; // go to next state

    }
}
