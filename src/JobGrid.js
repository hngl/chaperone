import Grid from "@material-ui/core/Grid/Grid";
import JobCard from "./JobCard";
import React, {Component} from "react";
import './JobGrid.css';
import shortSha from './shortSha'
import moment from "moment";

export default class JobGrid extends Component {

  constructor(props) {
    super(props);
    this.state = {
      branches: [],
      commits: new Map(),
    };
  }

  componentDidMount() {
    this.fetchBranches();
  }

  fetchBranches = () => {
    console.debug('Fetching branches');
    this.props.client.repos.getBranches({
      owner: this.props.owner,
      repo: this.props.repo
    }).then(({data}) => {
      console.debug('Fetched branches', data);
      this.setState({branches: data});
      data.forEach(branch => {
        if(!this.state.commits.has(branch.commit.sha)) {
          this.fetchCommit(branch.commit.sha);
        }
      })
    }).catch(console.error)
  };

  fetchCommit(sha) {
    console.debug(`Fetching commit ${shortSha(sha)}`);
    this.props.client.repos.getCommit({
      owner: this.props.owner,
      repo: this.props.repo,
      sha: sha
    })
        .then(({data}) => {
          console.debug(`Fetched commit ${shortSha(sha)}`, data);
          this.setState({commits: new Map(this.state.commits).set(sha, data)});
          this.fetchStatus(sha)
        }).catch(console.error)
  }

  fetchStatus(sha) {
    this.props.client.repos.getCombinedStatusForRef({
      owner: this.props.owner,
      repo: this.props.repo,
      ref: sha
    })
        .then(({data}) => {
          console.debug(`Fetched status for ${shortSha(sha)}`, data);
          let newCommit = Object.assign({}, this.getCommit(sha), {state: data.state, statuses: data.statuses});
          this.setState({commits: new Map(this.state.commits).set(sha, newCommit)})
        }).catch(console.error)
  }

  getCommit(sha) {
    return this.state.commits.get(sha);
  }

  render() {
    let sortedBranches = this.state.branches.slice().sort((branchA, branchB) => {
      if(!this.state.commits.has(branchA.commit.sha) && !this.state.commits.has(branchB.commit.sha)) {
        return 0; // Do nothing
      }
      if(!this.state.commits.has(branchA.commit.sha)) {
        return 2; // Sort B to a lower index
      }
      if(!this.state.commits.has(branchB.commit.sha)) {
        return -2; // Sort B to a lower index
      }
      let dateA = this.getCommit(branchA.commit.sha).commit.author.date;
      let dateB = this.getCommit(branchB.commit.sha).commit.author.date;
      if(dateA === dateB) {
        return 0; // Do nothing
      }
      return moment(dateA).isBefore(dateB) ? 1 : -1;
    });

    return (
        <Grid container spacing={16} className="job-grid">
          {sortedBranches.map(branch => {
            return (
                <Grid item xs={4} key={branch.name}>
                  <JobCard branch={branch} commit={this.getCommit(branch.commit.sha)}/>
                </Grid>
            )
          })}
        </Grid>
    )
  }
}