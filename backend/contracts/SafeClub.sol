// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SafeClub is ReentrancyGuard, Ownable {
    
    struct Proposal {
        uint256 id;
        address payable to;
        uint256 amount;
        string description;
        uint256 deadline;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
    }

    struct Member {
        bool isMember;
        uint256 joinedAt;
    }

    mapping(address => Member) public members;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    uint256 public proposalCount;
    address[] public memberList;

    event MemberAdded(address indexed member);
    event MemberRemoved(address indexed member);
    event ProposalCreated(uint256 indexed id, address indexed proposer, uint256 amount, string description, uint256 deadline);
    event Voted(uint256 indexed id, address indexed voter, bool support);
    event ProposalExecuted(uint256 indexed id, uint256 amount, address to);
    event Deposit(address indexed sender, uint256 amount);

    constructor() Ownable(msg.sender) {
        _addMember(msg.sender);
    }

    modifier onlyMember() {
        require(members[msg.sender].isMember, "Not a member");
        _;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    function addMember(address _member) external onlyOwner {
        require(!members[_member].isMember, "Already a member");
        _addMember(_member);
    }

    function removeMember(address _member) external onlyOwner {
        require(members[_member].isMember, "Not a member");
        members[_member].isMember = false;
        // Note: we don't remove from memberList to avoid gas cost of array manipulation, or we could swap-and-pop.
        // For simplicity/safety, we just flag as inactive.
        emit MemberRemoved(_member);
    }

    function _addMember(address _member) internal {
        members[_member] = Member({
            isMember: true,
            joinedAt: block.timestamp
        });
        memberList.push(_member);
        emit MemberAdded(_member);
    }

    function createProposal(address payable _to, uint256 _amount, string calldata _description, uint256 _deadline) external onlyMember {
        require(_deadline > block.timestamp, "Invalid deadline");

        uint256 proposalId = proposalCount++;
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.to = _to;
        newProposal.amount = _amount;
        newProposal.description = _description;
        newProposal.deadline = _deadline;

        emit ProposalCreated(proposalId, msg.sender, _amount, _description, _deadline);
    }

    function vote(uint256 _proposalId, bool _support) external onlyMember {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp < proposal.deadline, "Voting ended");
        require(!proposal.executed, "Already executed");
        require(!hasVoted[_proposalId][msg.sender], "Already voted");

        hasVoted[_proposalId][msg.sender] = true;

        if (_support) {
            proposal.votesFor++;
        } else {
            proposal.votesAgainst++;
        }

        emit Voted(_proposalId, msg.sender, _support);
    }

    function executeProposal(uint256 _proposalId) external nonReentrant {
        Proposal storage proposal = proposals[_proposalId];

        require(!proposal.executed, "Already executed");
        // Allow execution if approved, regardless of deadline
        require(proposal.votesFor > proposal.votesAgainst, "Proposal rejected");
        require(address(this).balance >= proposal.amount, "Insufficient funds in vault");

        proposal.executed = true;

        (bool success, ) = proposal.to.call{value: proposal.amount}("");
        require(success, "Transfer failed");

        emit ProposalExecuted(_proposalId, proposal.amount, proposal.to);
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getMemberCount() external view returns (uint256) {
        return memberList.length;
    }
}
