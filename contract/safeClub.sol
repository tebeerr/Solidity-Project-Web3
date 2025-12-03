// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

/**
 * @title Storage
 * @dev Store & retrieve value in a variable
 * @custom:dev-run-script ./scripts/deploy_with_ethers.ts
 */

 contract safeClub {

    address public owner ; 
    uint256 public memberCount ;
    uint256 public proposalCount ;

    address[] public members;                      


    event MemberAdded(address member);
    event MemberRemoved(address member);

    constructor() {
        owner = msg.sender;           
        members.push(owner);
        memberCount = 1;
    }

    modifier _onlyOwner (){
        require(msg.sender == owner , "only owner has the right to do this task");
        _;
    }


    function addMember (address _member) public _onlyOwner{
        require(_member != address(0), "Invalid address");

        members.push(_member);
        memberCount++;
        
        emit MemberAdded(_member);
    }


    function removeMember (address _member ) public _onlyOwner {
        require(_member != owner, "Cannot remove owner");

        memberCount--;

        emit MemberRemoved(_member);
    }


 }