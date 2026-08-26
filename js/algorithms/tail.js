class Tail {
    constructor(t) {
        this.t = t;
        this.root = new Node(t, true);
        this.tail = this.root;
        this.fastInserts = 0;
        this.fastInserted = true;
        this.internalSize = calculate_internal(t);
    }
    insert(page)
    {
        let pageLeaf = this.root;
        let temp;
        let stop;
        let tempNode;
        if(!this.root.leaf)
        {
            if(page>=this.tail.keys[0])
            {
                pageLeaf = this.tail;
                this.fastInserts++;
                this.fastInserted = true;
            }
            else
            {
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
            }
        }
        else{
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
                splitNode.parent = newParent;
                this.root = newParent;
                this.tail = splitNode;
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
                if(this.fastInserted)
                {
                    this.tail = splitNode;
                }
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

function isTailFastInsertCandidate(page)
{
    if (!tailTree || !tailTree.root) {
        return false;
    }
    if (tailTree.root.leaf) {
        return true;
    }

    const tailLeaf = tailTree.tail;
    if (!tailLeaf) {
        return false;
    }

    const tailKeys = getAuxiliaryNodeKeys(tailLeaf);
    if (tailKeys.length === 0) {
        return false;
    }

    return page >= tailKeys[0];
}

function renderTailTree(pathNodes, fastNodes)
{
    const focusNode = tailTree && tailTree.tail ? tailTree.tail : (tailTree ? tailTree.root : null);
    renderAuxiliaryTree(
        tailTree,
        "tail-tree-grid",
        "tail-tree-links",
        focusNode,
        "tail",
        pathNodes || [],
        fastNodes || []
    );
}

function initializeTailVisualization()
{
    renderTailTree([], []);
}

function runTailPhase()
{
    return new Promise((resolve) => {
        if (!Array.isArray(tail_data) || tail_data.length === 0) {
            resolve();
            return;
        }

        const page = tail_data[0];
        const willFastInsert = isTailFastInsertCandidate(page);
        const topInsertPath = willFastInsert ? [] : findAuxiliaryPath(tailTree, page);
        const fastInsertPath = (willFastInsert && tailTree && tailTree.tail) ? [tailTree.tail] : [];
        renderTailTree(topInsertPath, fastInsertPath);

        const commitDelay = Math.max(0, Math.floor(delay * 0.2));
        if (commitDelay === 0) {
            tailTree.insert(page);
            tail_data.shift();
            renderTailTree([], []);
            resolve();
            return;
        }

        setTimeout(() => {
            tailTree.insert(page);
            tail_data.shift();
            renderTailTree([], []);
            resolve();
        }, commitDelay);
    });
}
