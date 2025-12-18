// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import from OpenZeppelin - battle-tested security libraries
// In OpenZeppelin Contracts v5, ReentrancyGuard lives under utils/, not security/
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleTreasuryClub
 * @notice A basic club treasury where members can vote on spending proposals
 * @dev Uses OpenZeppelin for security (ReentrancyGuard) and access control (Ownable)
 */
contract SimpleTreasuryClub is Ownable, ReentrancyGuard {

    // ==================== STATE VARIABLES ====================
    
    uint256 public proposalCount;  // Total number of proposals created
    
    // Track all members
    address[] public members;
    mapping(address => bool) public isMember;
    
    // Track all proposals
    mapping(uint256 => Proposal) public proposals;
    
    // Track who voted on which proposal
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // ==================== STRUCTS ====================
    
    /**
     * @notice A proposal represents a request to spend club money
     */
    struct Proposal {
        uint256 id;                   // Unique identifier
        string description;           // What is this for?
        address payable recipient;    // Who gets the money?
        uint256 amount;              // How much money (in wei)?
        uint256 votesFor;            // Number of yes votes
        uint256 votesAgainst;        // Number of no votes
        uint256 deadline;            // When does voting end?
        bool executed;               // Has this been completed?
    }

    // ==================== EVENTS ====================
    
    // Events are like "logs" - they record what happened on the blockchain
    event MoneyReceived(address from, uint256 amount);
    event MemberAdded(address member);
    event MemberRemoved(address member);
    event ProposalCreated(uint256 proposalId, string description, uint256 amount);
    event VotePlaced(uint256 proposalId, address voter, bool support);
    event ProposalExecuted(uint256 proposalId, address recipient, uint256 amount);

    // ==================== CONSTRUCTOR ====================
    
    /**
     * @notice Creates the club - the deployer becomes owner and first member
     * @dev Ownable(msg.sender) sets the owner in the parent contract
     */
    constructor() Ownable(msg.sender) {
        // Add the deployer as first member
        isMember[msg.sender] = true;
        members.push(msg.sender);
        emit MemberAdded(msg.sender);
    }

    // ==================== MODIFIERS ====================
    
    /**
     * @notice Only club members can call functions with this modifier
     * @dev The underscore (_) is where the function code runs
     */
    modifier onlyMember() {
        require(isMember[msg.sender], "Only members can do this");
        _;
    }

    // ==================== RECEIVE MONEY ====================
    
    /**
     * @notice Special function - allows contract to receive ETH when sent directly
     * @dev "receive" is triggered when someone sends ETH without calling a function
     */
    receive() external payable {
        emit MoneyReceived(msg.sender, msg.value);
    }

    // ==================== MEMBER FUNCTIONS ====================
    
    /**
     * @notice Add a new member to the club
     * @param newMember Address of the person to add
     * @dev onlyOwner comes from the Ownable contract we inherited
     */
    function addMember(address newMember) external onlyOwner {
        require(!isMember[newMember], "Already a member");
        require(newMember != address(0), "Invalid address");
        
        isMember[newMember] = true;
        members.push(newMember);
        emit MemberAdded(newMember);
    }
    
    /**
     * @notice Remove a member from the club
     * @param member Address of the person to remove
     */
    function removeMember(address member) external onlyOwner {
        require(isMember[member], "Not a member");
        require(member != owner(), "Cannot remove owner");
        
        isMember[member] = false;
        emit MemberRemoved(member);
    }
    
    /**
     * @notice Get the total number of members
     * @return Total count of members
     */
    function getMemberCount() external view returns (uint256) {
        return members.length;
    }

    // ==================== PROPOSAL FUNCTIONS ====================
    
    /**
     * @notice Create a new spending proposal
     * @param description What the money will be used for (e.g., "Buy pizza for meetup")
     * @param recipient Who will receive the money
     * @param amount How much money to send in wei (1 ETH = 1000000000000000000 wei)
     * @param votingPeriod How long voting stays open in seconds (e.g., 86400 = 1 day)
     */
    function createProposal(
        string memory description,
        address payable recipient,
        uint256 amount,
        uint256 votingPeriod
    ) external onlyMember {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        require(votingPeriod > 0, "Voting period must be greater than 0");
        
        // Calculate when voting ends
        uint256 deadline = block.timestamp + votingPeriod;
        
        // Create and store the proposal
        proposals[proposalCount] = Proposal({
            id: proposalCount,
            description: description,
            recipient: recipient,
            amount: amount,
            votesFor: 0,
            votesAgainst: 0,
            deadline: deadline,
            executed: false
        });
        
        emit ProposalCreated(proposalCount, description, amount);
        proposalCount++;
    }
    
    /**
     * @notice Vote on a proposal
     * @param proposalId Which proposal to vote on (starts from 0)
     * @param support True = vote yes, False = vote no
     */
    function vote(uint256 proposalId, bool support) external onlyMember {
        Proposal storage proposal = proposals[proposalId];
        
        // Check if the proposal exists
        require(proposalId < proposalCount, "Proposal does not exist");
        
        // Check if voting is still open
        require(block.timestamp < proposal.deadline, "Voting has ended");
        
        // Check if already executed
        require(!proposal.executed, "Proposal already executed");
        
        // Check if this person already voted
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        
        // Mark that they voted
        hasVoted[proposalId][msg.sender] = true;
        
        // Count the vote
        if (support) {
            proposal.votesFor++;
        } else {
            proposal.votesAgainst++;
        }
        
        emit VotePlaced(proposalId, msg.sender, support);
    }
    
    /**
     * @notice Execute a proposal if it passed
     * @param proposalId Which proposal to execute
     * @dev nonReentrant protects against reentrancy attacks during ETH transfer
     */
    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        
        // Validation checks
        require(proposalId < proposalCount, "Proposal does not exist");
        require(!proposal.executed, "Already executed");
        require(proposal.votesFor > proposal.votesAgainst, "Proposal did not pass");
        require(address(this).balance >= proposal.amount, "Not enough money in treasury");
        
        // Mark as executed BEFORE sending money (prevents reentrancy)
        proposal.executed = true;
        
        // Send the money using call (recommended method)
        (bool success, ) = proposal.recipient.call{value: proposal.amount}("");
        require(success, "Transfer failed");
        
        emit ProposalExecuted(proposalId, proposal.recipient, proposal.amount);
    }

    // ==================== VIEW FUNCTIONS ====================
    // View functions don't change state - they just read data
    
    /**
     * @notice Check how much ETH is in the treasury
     * @return Balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getProposal(uint256 proposalId) external view returns (
        string memory description,
        address recipient,
        uint256 amount,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 deadline,
        bool executed
    ) {
        Proposal memory proposal = proposals[proposalId];
        return (
            proposal.description,
            proposal.recipient,
            proposal.amount,
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.deadline,
            proposal.executed
        );
    }
    
    /**
     * @notice Check if voting is still open for a proposal
     * @param proposalId Which proposal to check
     * @return true if you can still vote, false if closed
     */
    function isVotingOpen(uint256 proposalId) external view returns (bool) {
        Proposal memory proposal = proposals[proposalId];
        return block.timestamp < proposal.deadline && !proposal.executed;
    }
    
    /**
     * @notice Check if a proposal has enough votes to pass
     * @param proposalId Which proposal to check
     * @return true if more yes votes than no votes
     */
    function didProposalPass(uint256 proposalId) external view returns (bool) {
        Proposal memory proposal = proposals[proposalId];
        return proposal.votesFor > proposal.votesAgainst;
    }
}