function sware()
{
    let page = sware_data[0];
    swareTree.insert(page);
    sware_data.shift();
    
    let tempNode = swareTree.root;
    while(!tempNode.leaf)
    {
        tempNode = tempNode.children[0];
    }
    while(tempNode.next!=null)
    {
        tempNode
    }
}

//don't edit anything under this.
class Sware {
    constructor(t) {
        this.t = t;
        this.root = new Node(t, true);
        this.tail = this.root;
        this.fastInserts = 0;
        this.fastInserted = true;
        this.lastSortedIndex = 0;
        this.insertIndexX = 0;
        this.insertIndexY = 0;
        this.buffer = [];
        this.bufferDict = [];
        this.tempArray = [];
        this.full = false;
        this.size = 0;
        this.leafs = 1;
        for(let i = 0;i<t;i++)
        {
            this.buffer.push([]);
            this.bufferDict.push([]);
        }
    }
    insert(page)
    {
        console.log(JSON.stringify(this.buffer));
        console.log(JSON.stringify(this.bufferDict));
        console.log(this.lastSortedIndex);
        console.log("break");
        let pageLeaf = this.root;
        let temp;
        let stop;
        let tempNode;
        let newTail;
        this.load(page);
        if(this.full)
        {
            this.insertIndexX = this.t-Math.min(this.lastSortedIndex,Math.floor((this.t/2)-1))-1;
            this.insertIndexY = 0;
            this.full = false;
            if(!this.root.leaf)
            {
                
                for(let i = 0;i<=this.lastSortedIndex&&i<=Math.floor((this.t/2)-1);i++)
                {
                    if(this.bufferDict[i][0]>=this.tail.keys[this.tail.n-1])
                    {
                        this.buffer[i].sort((a,b)=>a-b);
                        this.tail.parent.keys.push(this.buffer[i][0]);
                        newTail = new Node(this.t,true);
                        this.leafs++;
                        this.size+=this.t;
                        newTail.n=10;
                        newTail.keys = this.buffer[i];
                        this.tail.next = newTail;
                        newTail.parent = this.tail.parent;
                        this.tail.parent.children.push(newTail);
                        this.tail.parent.n++;
                        do
                        {
                            tempNode = this.split(this.tail.parent);
                            pageLeaf = tempNode;
                        }
                        while(pageLeaf.n>this.t);
                        this.tail = newTail;
                        this.fastInserts++;
                        this.fastInserted = true;
                    }
                    else
                    {
                        this.fastInserted = false;
                        for(let j = 0;j<this.t;j++)
                        {
                            this.size++;
                            page = this.buffer[i][j];
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
                            if(pageLeaf.n<this.t)
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
                                while(pageLeaf.n>this.t);
                            }
                        }
                    }
                }
                
            }
            else{
                if(this.root.keys.length==0)
                {
                    if(this.lastSortedIndex>0)
                    {    
                        let newRoot = new Node(this.t, false);
                        let firstLeaf = new Node(this.t, true);
                        let secondLeaf = new Node(this.t ,true);
                        this.buffer[0].sort((a,b)=>a-b);
                        this.buffer[1].sort((a,b)=>a-b);
                        newRoot.children = [firstLeaf, secondLeaf];
                        newRoot.keys = [this.buffer[1][0]];
                        newRoot.n=1;
                        firstLeaf.keys = this.buffer[0];
                        secondLeaf.keys = this.buffer[1];
                        firstLeaf.next = secondLeaf;
                        firstLeaf.parent = newRoot;
                        secondLeaf.parent = newRoot;
                        firstLeaf.n = this.t;
                        secondLeaf.n = this.t;
                        this.tail = secondLeaf;
                        this.leafs=2;
                        this.size = 2*this.t;
                        this.root = newRoot;
                        this.fastInserted = true;
                        this.fastInserts+=2;
                        for(let i = 2;i<=this.lastSortedIndex&&i<this.t/2;i++)
                        {
                            if(this.bufferDict[i][0]>=this.tail.keys[this.tail.n-1])
                            {
                                this.buffer[i].sort((a,b)=>a-b);
                                this.tail.parent.keys.push(this.buffer[i][0]);
                                newTail = new Node(this.t,true);
                                this.leafs++;
                                this.size+=this.t;
                                newTail.n=10;
                                newTail.keys = this.buffer[i];
                                this.tail.next = newTail;
                                newTail.parent = this.tail.parent;
                                this.tail.parent.children.push(newTail);
                                this.tail.parent.n++;
                                do
                                {
                                    tempNode = this.split(this.tail.parent);
                                    pageLeaf = tempNode;
                                }
                                while(pageLeaf.n>this.t);
                                this.tail = newTail;
                                this.fastInserts++;
                                this.fastInserted = true;
                            }
                            else
                            {
                                this.fastInserted = false;
                                for(let j = 0;j<this.t;j++)
                                {
                                    this.size++;
                                    page = this.buffer[i][j];
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
                                    if(pageLeaf.n<this.t)
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
                                        while(pageLeaf.n>this.t);
                                    }
                                }
                            }
                        }
                    }
                    else
                    {
                        this.buffer[0].sort((a,b)=>a-b);
                        this.root.keys = [...this.buffer[0]];
                        this.root.n = this.t;
                        this.size = this.t;
                        this.fastInserts++;
                        this.fastInserted = true;
                    }
                }
                else if(this.root.keys.length==this.t)
                {
                    this.buffer[0].sort((a,b)=>a-b);
                    if(this.buffer[0][0]>this.root.keys[this.root.keys.length-1])
                    {
                        let newRoot = new Node(this.t, false);
                        let firstLeaf = new Node(this.t, true);
                        let secondLeaf = new Node(this.t ,true);
                        newRoot.children = [firstLeaf, secondLeaf];
                        newRoot.keys = [this.buffer[0][0]];
                        newRoot.n=1;
                        firstLeaf.keys = this.root.keys;
                        secondLeaf.keys = this.buffer[0];
                        firstLeaf.next = secondLeaf;
                        firstLeaf.parent = newRoot;
                        secondLeaf.parent = newRoot;
                        firstLeaf.n = this.t;
                        secondLeaf.n = this.t;
                        this.tail = secondLeaf;
                        this.leafs=2;
                        this.size = 2*this.t;
                        this.root = newRoot;
                        this.fastInserted = true;
                        this.fastInserts+=2;
                    }
                    else
                    {
                        for(let i = 0;i<this.buffer[0].length;i++)
                        {
                            console.log("test");
                            this.size++;
                            page = this.buffer[0][i];
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
                            if(pageLeaf.n<this.t)
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
                                while(pageLeaf.n>this.t);
                            }
                        }
                    }
                    for(let i = 1;i<=this.lastSortedIndex&&i<this.t/2;i++)
                    {
                        if(this.bufferDict[i][0]>=this.tail.keys[this.tail.n-1])
                        {
                            this.buffer[i].sort((a,b)=>a-b);
                            this.tail.parent.keys.push(this.buffer[i][0]);
                            newTail = new Node(this.t,true);
                            this.leafs++;
                            this.size+=this.t;
                            newTail.n=10;
                            newTail.keys = this.buffer[i];
                            this.tail.next = newTail;
                            newTail.parent = this.tail.parent;
                            this.tail.parent.children.push(newTail);
                            this.tail.parent.n++;
                            do
                            {
                                tempNode = this.split(this.tail.parent);
                                pageLeaf = tempNode;
                            }
                            while(pageLeaf.n>this.t);
                            this.tail = newTail;
                            this.fastInserts++;
                            this.fastInserted = true;
                        }
                        else
                        {
                            this.fastInserted = false;
                            for(let j = 0;j<this.t;j++)
                            {
                                this.size++;
                                page = this.buffer[i][j];
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
                                if(pageLeaf.n<this.t)
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
                                    while(pageLeaf.n>this.t);
                                }
                            }
                        }
                    }
                }
            } 
            this.resetBuffer();   
            console.log("test");
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
    load(page)
    {
        this.buffer[this.insertIndexX][this.insertIndexY]= page;
        this.insertIndexY++;
        if(this.insertIndexY==1)
        {
            this.bufferDict[this.insertIndexX] = [page, page];
        }
        else 
        {
            if(page>this.bufferDict[this.insertIndexX][1])
                this.bufferDict[this.insertIndexX][1] = page;
            else if(page<this.bufferDict[this.insertIndexX][0])
                this.bufferDict[this.insertIndexX][0] = page;
        }
        this.sort();
    }
    sort()
    {
        let min = this.bufferDict[this.insertIndexX][0];
        if(this.insertIndexX-1==this.lastSortedIndex)
        {
            if(min>=this.bufferDict[this.lastSortedIndex][1])
                this.lastSortedIndex++;
        }
        for(let i = this.lastSortedIndex;i>0;i--)
        {
            if(min<this.bufferDict[i][1]&&this.insertIndexX!=i)
            {
                this.lastSortedIndex = i-1;
            }
        }
        if(this.insertIndexY==this.t)
        {
            this.insertIndexX++;
            this.insertIndexY=0;
        }
        if(this.insertIndexX==this.t)
        {
            this.full = true;
        }
    }

    resetBuffer()
    {
        let flushed = Math.min(this.lastSortedIndex,Math.floor((this.t/2)-1));
        for(let i = 0;i<=flushed;i++)
        {
            this.buffer[i].length = 0;
            this.bufferDict[i].length = 0;
        }
        for(let i = flushed+1;i<this.t;i++)
        {
            for(let j = 0;j<this.t;j++)
            {
                this.tempArray.push(this.buffer[i][j]);
                this.tempArray.sort((a,b)=>a-b);
            }
        }
        for(let i = 0;this.tempArray.length>0&&i<this.t-flushed-1;i++)
        {
            for(let j = 0;j<this.t;j++)
            {
                this.buffer[i][j] = this.tempArray[0];
                this.tempArray.shift();
            }
            this.bufferDict[i] = [this.buffer[i][0],this.buffer[i][this.t-1]];
        }
        for(let i = this.t-(flushed)-1;i<this.t;i++)
        {
            this.buffer[i].length = 0;
            this.bufferDict[i].length = 0;
        }
        this.lastSortedIndex = this.t-(flushed)-2;
    }

    split(pageLeaf)
    {
        if(pageLeaf.leaf == true)
        {
            this.leafs++;
            if(pageLeaf.parent == null)
            {
                let newParent = new Node(this.t,false);
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
                let newParent = new Node(this.t,false);
                let splitNode = new Node(pageLeaf.t,false);
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
                let splitNode = new Node(pageLeaf.t,false);
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
