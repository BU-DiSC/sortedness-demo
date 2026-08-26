class LilTree {
    constructor(t) {
        this.t = t;
        this.root = new Node(t, true);
        this.lil = this.root;
        this.size= 0;
        this.fastInserts = 0;
        this.fastInserted = false;
        this.fastPathResets = 0;
        this.page;
        this.internalSize = calculate_internal(t);
    }
    insert(page)
    {
        this.size++;
        let pageLeaf = this.root;
        this.page = page;
        let temp;
        let stop;
        let tempNode;
        if(!this.root.leaf)
        {
            if(page>=this.lil.keys[0]&&((this.lil.next==null)||page<this.lil.next.keys[0]))
            {
                pageLeaf = this.lil;
                this.fastInserts++;
                this.fastInserted = true;
            }
            else
            {
                this.fastPathResets++;
                this.fastInserted = false;
                while(!(pageLeaf.leaf))
                {
                    stop = false
                    for(let i = 0;i<pageLeaf.keys.length&&!stop;i++)
                    {
                        if(page<pageLeaf.keys[i])
                        {
                            stop = true;
                            temp = i;
                        }
                    }
                    if(!stop)
                    {
                        temp = pageLeaf.keys.length;
                    }
                    pageLeaf = pageLeaf.children[temp];
                }
                this.lil = pageLeaf;
            }
        }
        else
        {
            this.fastInserts++;
            this.fastInserted = true;
        }
        if(pageLeaf.n<pageLeaf.t)
        {
            this.insertInOrder(page,pageLeaf.keys);
            pageLeaf.n++;
        }
        else{
            this.insertInOrder(page,pageLeaf.keys);
            pageLeaf.n++;
            do
            {
                tempNode = this.split(pageLeaf);
                pageLeaf = tempNode;
            }
            while(pageLeaf.n>pageLeaf.t);
        }
    }
    insertInOrder(page,array)
    {
        let temp;
        let stop = false;
        if(page<array[0])
        {
            stop = true;
            temp = 0;
        }
        for(let i = 0; i < array.length - 1 && !stop; i++)
        {
            if(page > array[i] && page < array[i+1])
            {
                stop = true;
                temp = i + 1;
            }
           
        }
        if(!stop)
        {
            temp = array.length;
        }
        array.splice(temp, 0, page);
        return temp;
    }
    split(pageLeaf)
    {
        if(pageLeaf.leaf == true)
        {
            if(pageLeaf.parent == null)
            {
                let newParent = new Node(this.internalSize,false);
                let splitNode = new Node(pageLeaf.t,true);
                let mid = Math.floor(pageLeaf.n/2);
                splitNode.n = pageLeaf.n - mid;
                pageLeaf.n = mid;
                const left = (pageLeaf.keys).slice(0,mid);
                const right = (pageLeaf.keys).slice(mid);
                pageLeaf.keys = left;
                splitNode.keys = right;
                splitNode.next = pageLeaf.next;
                pageLeaf.next = splitNode;
                //console.log(splitNode.keys[0]);
                newParent.keys[0] = splitNode.keys[0];
                newParent.children[0] = pageLeaf;
                newParent.children[1] = splitNode;
                newParent.n = 1;
                pageLeaf.parent = newParent;
                if(this.fastInserted&&this.page>=splitNode.keys[0])
                    this.lil = splitNode;
                splitNode.parent = newParent;
                this.root = newParent;
                return newParent;
            }
            else
            {
                //console.log("true");
                let splitNode = new Node(pageLeaf.t,true);
                let mid = Math.floor(pageLeaf.n/2);
                splitNode.n = pageLeaf.n - mid;
                pageLeaf.n = mid;
                const left = (pageLeaf.keys).slice(0,mid);
                const right = (pageLeaf.keys).slice(mid);
                pageLeaf.keys = left;
                splitNode.keys = right;
                splitNode.next = pageLeaf.next;
                pageLeaf.next = splitNode;
                splitNode.parent = pageLeaf.parent;
                let index = this.insertInOrder(splitNode.keys[0], pageLeaf.parent.keys);
                pageLeaf.parent.children.splice(index+1, 0, splitNode);
                pageLeaf.parent.n++;
                if(this.fastInserted&&this.page>=splitNode.keys[0])
                    this.lil = splitNode;
                return pageLeaf.parent;
            }
        }
        else
        {
            if(pageLeaf.parent == null)
            {
                let newParent = new Node(this.internalSize,false);
                let splitNode = new Node(this.internalSize,false);
                let mid = Math.floor(pageLeaf.n/2);
                splitNode.n = pageLeaf.n - mid-1;
                pageLeaf.n = mid;
                newParent.keys[0] = pageLeaf.keys[mid];
                const left = (pageLeaf.keys).slice(0,mid);
                const right = (pageLeaf.keys).slice(mid+1);
                pageLeaf.keys = left;
                splitNode.keys = right;
                splitNode.next = pageLeaf.next;
                pageLeaf.next = splitNode;
                //console.log(splitNode.keys[0]);
                const leftChild = (pageLeaf.children).slice(0,mid+1);
                const rightChild = (pageLeaf.children).slice(mid+1);
                pageLeaf.children = leftChild;
                splitNode.children = rightChild;
                for(let i = 0;i<rightChild.length;i++)
                {
                    rightChild[i].parent = splitNode;
                }
                newParent.children[0] = pageLeaf;
                newParent.children[1] = splitNode;
                newParent.n = 1;
                pageLeaf.parent = newParent;
                splitNode.parent = newParent;
                this.root = newParent;
                return newParent;
            }
            else
            {
                //not done
                console.log("true");
                let splitNode = new Node(this.internalSize,false);
                let mid = Math.floor(pageLeaf.n/2);
                splitNode.n = pageLeaf.n - mid-1;
                pageLeaf.n = mid;
                const middle = pageLeaf.keys[mid];
                const left = (pageLeaf.keys).slice(0,mid);
                const right = (pageLeaf.keys).slice(mid+1);
                pageLeaf.keys = left;
                splitNode.keys = right;
                splitNode.next = pageLeaf.next;
                pageLeaf.next = splitNode;
                const leftChild = (pageLeaf.children).slice(0,mid+1);
                const rightChild = (pageLeaf.children).slice(mid+1);
                splitNode.parent = pageLeaf.parent;
                pageLeaf.children = leftChild;
                splitNode.children = rightChild;
                for(let i = 0;i<rightChild.length;i++)
                {
                    rightChild[i].parent = splitNode;
                }
                let index = this.insertInOrder(middle, pageLeaf.parent.keys);
                pageLeaf.parent.children.splice(index+1, 0, splitNode);
                pageLeaf.parent.n++;
                return pageLeaf.parent;
            }
        }
    }


   
}

function isLilFastInsertCandidate(page)
{
    if (!lilTree || !lilTree.root) {
        return false;
    }
    if (lilTree.root.leaf) {
        return true;
    }

    const lilLeaf = lilTree.lil;
    if (!lilLeaf) {
        return false;
    }

    const lilKeys = getAuxiliaryNodeKeys(lilLeaf);
    if (lilKeys.length === 0) {
        return false;
    }

    const nextLeaf = lilLeaf.next;
    const nextKeys = getAuxiliaryNodeKeys(nextLeaf);
    const nextMin = nextKeys.length > 0 ? nextKeys[0] : null;
    return page >= lilKeys[0] && (nextMin == null || page < nextMin);
}

function renderLilTree(pathNodes, fastNodes)
{
    const focusNode = lilTree && lilTree.lil ? lilTree.lil : (lilTree ? lilTree.root : null);
    renderAuxiliaryTree(
        lilTree,
        "lil-tree-grid",
        "lil-tree-links",
        focusNode,
        "lil",
        pathNodes || [],
        fastNodes || []
    );
}

function initializeLilVisualization()
{
    renderLilTree([], []);
}

function runLilPhase()
{
    return new Promise((resolve) => {
        if (!Array.isArray(lil_data) || lil_data.length === 0) {
            resolve();
            return;
        }

        const page = lil_data[0];
        const willFastInsert = isLilFastInsertCandidate(page);
        const topInsertPath = willFastInsert ? [] : findAuxiliaryPath(lilTree, page);
        const fastInsertPath = (willFastInsert && lilTree && lilTree.lil) ? [lilTree.lil] : [];
        renderLilTree(topInsertPath, fastInsertPath);

        const commitDelay = Math.max(0, Math.floor(delay * 0.2));
        if (commitDelay === 0) {
            lilTree.insert(page);
            lil_data.shift();
            renderLilTree([], []);
            resolve();
            return;
        }

        setTimeout(() => {
            lilTree.insert(page);
            lil_data.shift();
            renderLilTree([], []);
            resolve();
        }, commitDelay);
    });
}
