import 'isomorphic-fetch';
import React, { Component, PropTypes } from 'react';
import PaperNetGraph from './PaperNetGraph';

import ReactQuill from 'react-quill';
import 'quill/dist/quill.snow.css';

import './style.css';

class SingleTreePage extends Component {
  static propTypes = {
    id: PropTypes.string.isRequired,
  };
  
  constructor(props) {
    super(props);
    this.state = {
      tree: {},
      title: '',
      tags: [],
      content: '',
      branch: 5,
      depth: 2,
      focusTitle: '',
      nodes: [],
      edges: [],
      titleToID: {},
      data: {},
      uniqTitles: [],
      pushable: [],
      runOnce: false,
      drawing: true,
      addNote: false, 
    };
    this.myGenNode = this.myGenNode.bind(this);
    this.focus = this.focus.bind(this);
  }

  componentDidMount() {
    const id = this.props.id;
    fetch(`/api/tree/${id}`)
      .then(res => res.json())
      .then(json => {
        this.setState({
          tree: JSON.parse(json.tree),
        });
        console.log(JSON.parse(json.tree))
        this.handleTree()
      });
  }



  handleDelClick = () => {
    const id = this.props.id;
    const confirm = window.confirm('確定要刪除樹嗎？');
    if (confirm) {
      fetch(`/api/tree/${id}`, {
        method: 'DELETE'
      })
      .then(() => {
        //window.alert('刪除成功');
        window.location.href = '#/trees';
      })
      .catch( err => console.log('delete error !!! '));
    }
  }

  focus(title) {
    this.setState({ focusTitle: title });
  }

  treeGetIndex(tree) {
    const { title, parent, children } = tree;
    this.setState({ uniqTitles: [...this.state.uniqTitles, title] });
    if (parent.length > 0) {
      for (var i = 0; i < parent.length; ++i) {
        this.treeGetIndex(parent[i]);
      }
    }
    if (children.length > 0) {
      for (var j = 0; j < children.length; j++) {
        this.treeGetIndex(children[j]);
      }
    }
  }

  treeToNode(tree) {
    const { title, url, author, publisher, parent, children } = tree;
    const myNodes = this.state.nodes;
    //myNodes = [...myNodes, { myID: nowID, title: title, url: url, author: author }];
    const nowID = this.state.titleToID[title];  
    let canPush = this.state.pushable;
    if (canPush[title] === true) {
      console.log('pushing node ' + title + ' id ' + nowID);
      this.setState({ nodes: [...myNodes, { myID: nowID, title: title, url: url, author: author, publisher: publisher }] });
      canPush[title] = false
      this.setState({ pushable: canPush });
      if (parent.length > 0) {
        for (var i = 0; i < parent.length; ++i) {
          this.treeToNode(parent[i]);
        }
      }
      if (children.length > 0) {
        for (var j = 0; j < children.length; j++) {
          this.treeToNode(children[j]);
        }
      }
    }
    else {
      console.log('droping node ' + title + ' id ' + nowID);
    }
  }

  treeToEdge(tree) {
    const { title, parent, children } = tree;
    const titleToID = this.state.titleToID;
    console.log('visiting node ' + title);
    console.log('adding parents of ' + title);
    if (parent.length > 0) {
      for (var i = 0; i < parent.length; i++) {
        //myEdges = [...myEdges, { from: titleToID[title], to: titleToID[parent[i].title] }];
        this.setState({ edges: [...this.state.edges, { from: titleToID[parent[i].title], to: titleToID[title] }] });
        console.log('adding edge from id ' + titleToID[title] + ' to id ' + titleToID[parent[i].title]);
        this.treeToEdge(parent[i]);
      }
    }
    console.log('adding children of ' + title);
    if (children.length > 0) {
      for (var j = 0; j < children.length; j++) {
        //myEdges = [...myEdges, { to: titleToID[title], from: titleToID[children[j].title] }];
        this.setState({ edges: [...this.state.edges, { to: titleToID[children[j].title], from: titleToID[title] }] });
        console.log('adding edge from id ' + titleToID[children[j].title] + ' to id ' + titleToID[title]);
        this.treeToEdge(children[j]);
      }
    }
    console.log('leaving node ' + title);
  }

  myGenNode(vertex) {
    const { myID, title } = vertex;
    let self = this;
    let myChoseNode = function (values, id, selected, hovering) {
      values.color = '#D2E5FF';
      values.borderWidth *= 2;
      values.borderColor = '#2B7CE9';
      values.shadow = true;
      console.log('chose node ' + myID);
      self.focus(title);
      self.fetchFocusContent();
    };
    return { id: myID, label: title, size: 150, color: '#FFCFCF', shape: 'box', font: { face: 'monospace', align: 'left' }, chosen: { node: myChoseNode } };
  }

  clearGraphData = () => {
    this.setState({
      focusTitle: '',
      nodes: [],
      edges: [],
      titleToID: {},
      drawing: true,
      data: {},
      uniqTitles: [],
      pushable: [],
      runOnce: true,
    });
  }

  handleTree = () => {
    this.clearGraphData();
    const json = this.state.tree
    this.treeGetIndex(json);
    let uniqTitles = Array.from( new Set(this.state.uniqTitles));
    let myDic = {}
    let pushable = {}
    for (var i = 0; i < uniqTitles.length; ++i) {
      myDic[uniqTitles[i]] = i;
      pushable[uniqTitles[i]] = true;
    }
    this.setState({ uniqTitles: uniqTitles, titleToID: myDic, pushable: pushable });
    this.treeToNode(json);
    this.treeToEdge(json);
    const newdata = {
      nodes: this.state.nodes.map((v, i) => this.myGenNode(v)),
      edges: this.state.edges
    };
    this.setState({ data: newdata });
    this.setState({ drawing: false });
  }

  renderFocusItem() {
    for (var i = 0; i < this.state.nodes.length; ++i) {
      if (this.state.focusTitle===this.state.nodes[i].title) {
        const { myID, title, url, author, publisher } = this.state.nodes[i];
        const authorString = (typeof(author)==='string') ? author : author.join(', ');
        //if (this.state.addNote === false) {
        //  this.fetchFocusContent()
        //}
        return (
          <div className="panel-body">
            <div>ID: {myID}</div>
            <div>Title: {title}</div>
            <div>Authors: {authorString}</div>
            <div>Publisher: {publisher}</div>
            <a href={url} target="_blank">Link to paper</a>
            <div>Notes:</div>
            <div
              dangerouslySetInnerHTML={{ __html: this.state.content }}
            />
          </div>
        );
      }
    }
  }

  fetchFocusContent() {
    const body = {userId: this.props.user.id, paperTitle: this.state.focusTitle}
    fetch('/api/note/getNote', {
      headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(body),
    })
    .then( res => res.json() )
    .then( json => {
      console.log(json)
      if(json.success === true) {
        console.log('FIND NOTE')
        this.setState({content: json.content})
      } else {
        this.setState({content: ''})
      }
    })
  }

  handleEditNote = () => {
    this.setState({addNote: true})
  }

  renderTitle = () => {
    const { tree } = this.state;

    return (
      <div>
      <h2>{tree.title}</h2>
        <p>Authors: {tree.author}</p>
        <p>Publisher: {tree.publisher}</p>
        <p>URL: <a href={tree.url} target="_blank">Link to paper</a></p>
      </div>
    )
  }

  onEditorChange = editorContent => {
    this.setState({
      content: editorContent,
    });
  }

  renderTree() {
    return (
      <div>
        { this.state.focusTitle !== '' ? (
          <div className="row">
            <div className="col-md-12">
              <div className="panel panel-primary">
                <div className="panel-heading">
                  <h3 className="panel-title">Paper Information</h3>
                </div>
                { this.renderFocusItem() }
              </div>
            </div>
            {
              (this.state.addNote === true)? (<div className="col-md-12">
                <ReactQuill
                  theme="snow"
                  value={this.state.content}
                  onChange={this.onEditorChange} />
                <a className="btn btn-primary btn-lg" role="button" onClick={this.handleStoreNote}>Finished</a>
              </div> ):(<a className="btn btn-primary btn-lg" role="button" onClick={this.handleEditNote}>Edit Note</a>)
            }
          </div> 
          ) : null }
        <div className="row">
          <div className="col-md-12 mycanvas">
            { this.state.runOnce===true ? (
                this.state.drawing === false ? ( <div className="center-block"><PaperNetGraph graph={this.state.data} ref="graph" /></div> ) : <h3>Drawing...</h3> ) : null }
          </div>
        </div>
      </div>
    );
  }

  handleStoreNote = () => {
    const confirm = 1;//window.confirm('Are you sure to add the note？');
    if (confirm) {
      let body = {
        paperTitle: this.state.focusTitle,
        content: this.state.content,
        userId: this.props.user.id,
      }
      fetch('/api/note', {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(body),
      }).then(result => {
        console.log(result);
        this.setState({addNote: false})
        //window.location.href = '#/';
      }).catch(err => console.log('POST failed!!'));
    }
  }

  render() {
    return (
      <div className="container">
        <div className="row">
          <div className="col-md-12">
            <div className="page-header">
              {this.renderTitle()}
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-12">
            {this.renderTree()}
          </div>
          <div className="col-sm-12">
            <button
              className="btn btn-danger"
              role="button"
              onClick={this.handleDelClick}
            >刪除</button>
          </div>
        </div>
      </div>
    );
  }
}

export default SingleTreePage;
