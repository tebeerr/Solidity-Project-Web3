// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

 contract safeClub {

    address public owner ; 
    uint256 public memberCount ;
    uint256 public proposalCount ;

    address[] public members;                      
    mapping (address => bool) public isMember;

    event MemberAdded(address member);
    event MemberRemoved(address member);

    constructor() {
        owner = msg.sender;           
        members.push(owner);
        memberCount = 1;
        isMember[owner] = true;
    }

    modifier _onlyOwner (){
        require(msg.sender == owner , "only owner has the right to do this task !");
        _;
    }

    modifier _onlyMember (){
        require(isMember[msg.sender] , "only member has the right to this task !");
        _;
    }


    function addMember (address _member) public _onlyOwner{
        require(_member != address(0), "Invalid address");
        require(!isMember[_member], "this Member already exists");
        
        isMember[_member] = true ;
        members.push(_member);
        memberCount++;
        
        emit MemberAdded(_member);
    }


    function removeMember (address _member ) public _onlyOwner {
        require(isMember[_member] , "Not a member");
        require(_member != owner, "Cannot remove owner");

        isMember[_member] = false;
        memberCount--;
        members.pop();

        emit MemberRemoved(_member);
    }

    function getAllMembers() public view returns(address[] memory) {
        return members;
    } 


    

 }