
/* 
 * One step of the QuIT algorithm
 */

function quit() {
    // Get the page from the data stream
    let page;
    // If we are at the start state fill the data stream too
    if (total_data.length == selectedN) {
        page = total_data[0];
        total_data.shift();
        for (let i = 0; i < 15; i++) {
            const p = document.getElementById("page" + i);
            p.innerHTML = total_data[i];
            total_data.shift();
        }
    }
    // Not the start state
    else {
        // Fill up the data stream, shift everything left
        page = document.getElementById("page0").innerHTML;
        let page_i;
        for (page_i = 0; page_i < 14; page_i++) {
            // Shift all pages to the left
            const p = document.getElementById("page" + page_i);
            const page_next = document.getElementById("page" + (page_i + 1));
            p.innerHTML = page_next.innerHTML;
        }
        // Fill the last page in the data stream
        const last_p = document.getElementById("page" + page_i); 
        // If we are at the end of the data stream, stop the algorithm
        if (total_data.length == 0) {
            running = false;
        }
        else {
            last_p.innerHTML = total_data[0];
            total_data.shift();
        }
    }

    page = parseInt(page); // convert page to integer
        
    // Initial phase - building first pole while we have less than leaf_node_size
    if (inserted_data_quit.length < leaf_node_size - 1) {        
        inserted_data_quit.push(page);
        pole.push(page);
        pole.sort((a, b) => a - b);
        quit_fast_inserts++;
        return;
    }
    
    // Create pole_prev when we first reach leaf_node_size
    if (inserted_data_quit.length == leaf_node_size - 1) {
        inserted_data_quit.push(page);
        pole.push(page);
        pole.sort((a, b) => a - b);
        
        // Get a copy of the pole
        let pole_copy = [...pole];
        // Empty the pole
        pole = [];
        
        // Split at 50% (predefined)
        let mid = Math.floor(leaf_node_size / 2);
        
        // Split the pole into pole_prev and pole, first half goes to pole_prev
        for (let i = 0; i < mid; i++) {
            pole_prev.push(pole_copy[i]);
        }
        // Next half goes to pole
        for (let i = mid; i < leaf_node_size; i++) {
            pole.push(pole_copy[i]);
        }
        
        // Pole changes, do animations
        let random_x = Math.floor(Math.random() * 81) + 10;
        document.getElementById("pole").style.left = random_x + "%";
        quit_pole_resets++;
        
        return;
    }
        
    // Get minimum pages for prediction
    let q = Math.min(...pole);
    let p = Math.min(...pole_prev);
        
    // Check if page belongs to current pole's range
    if (page >= q && page <= Math.max(...pole)) {
        console.log("page belongs to current pole range");
        
        // Handle pole splitting if needed (leaf node size is reached)
        if (pole.length == leaf_node_size) {
            console.log("Pole is full - Initiating split");
            
            let pole_copy = [...pole];
            pole = [];
            pole_next = [];
            
            // Split
            let mid = Math.floor(leaf_node_size / 2);
            for (let i = 0; i < mid; i++) {
                pole.push(pole_copy[i]);
            }
            for (let i = mid; i < leaf_node_size; i++) {
                pole_next.push(pole_copy[i]);
            }
            
            // Calculate catching up condition
            let e = Math.min(...pole_next);
            let x = q + ((q-p) / pole_prev.length) * pole.length * 1.5;
            
            console.log("Catching up check:");
            console.log("e: ", e);
            console.log("x ", x);
            
            // Check if pole_next is catching up (if it is, move pole forward)
            if (e <= x) {
                console.log("Catching up - Moving pole forward");
                pole_prev = pole;
                pole = pole_next;
                pole_next = [];
                quit_pole_resets++;

                // Pole changes, do animations
                let random_x = Math.floor(Math.random() * 81) + 10;
                document.getElementById("pole").style.left = random_x + "%";
                quit_pole_resets++;
                return;
            } 
            // If pole_next is not catching up, do nothing
            else {
                console.log("Not catching up - Maintaining pole_prev, pole, and pole_next");
                return;
            }
        }
        
        // Fast insert into current pole
        inserted_data_quit.push(page);
        pole.push(page);
        pole.sort((a, b) => a - b);
        quit_fast_inserts++;
        
        console.log("Fast insert complete. New pole:", pole);
        
    } 
    // Page is outside pole range
    else {
        console.log("page is outside pole range - Handling outlier");
        
        // Simulate top_insert by checking if page belongs in pole_next
        let leaf_for_outlier = null;
        if (pole_next.length > 0 && page >= Math.min(...pole_next) && page <= Math.max(...pole_next)) {
            leaf_for_outlier = 'pole_next';
        }
        
        inserted_data_quit.push(page);
        
        // Update pole structure if outlier belongs in pole_next
        if (leaf_for_outlier === 'pole_next') {
            console.log("Outlier belongs in pole_next - Catching up");
            console.log("Making pole_next the new pole");
            pole_next.push(page);
            pole_next.sort((a, b) => a - b);
            pole_prev = pole;
            pole = pole_next;
            pole_next = [];
            quit_pole_resets++;

            // Pole changes, do animations
            let random_x = Math.floor(Math.random() * 81) + 10;
            document.getElementById("pole").style.left = random_x + "%";
            quit_pole_resets++;
        } else {
            console.log("True outlier - Requires top insert");
            quit_top_inserts++;
        }
    }
    
    console.log("Finished processing page", page);

}