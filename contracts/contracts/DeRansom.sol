// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title DeRansom
 * @dev Smart contract for logging ransomware detection events on the blockchain
 */
contract DeRansom {
    // Contract owner
    address public owner;
    
    // Counter for total events
    uint256 private eventCount;
    
    // Event emitted when a security event is logged
    event SecurityEvent(
        address indexed reporter,
        string fileHash,
        string eventType,
        string ipfsHash,
        uint256 timestamp
    );
    
    /**
     * @dev Constructor sets the contract owner
     */
    constructor() {
        owner = msg.sender;
        eventCount = 0;
    }
    
    /**
     * @dev Modifier to restrict certain functions to the contract owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the contract owner can call this function");
        _;
    }
    
    /**
     * @dev Log a security event to the blockchain
     * @param _fileHash Hash of the affected file (not the full path for privacy)
     * @param _eventType Type of security event (e.g., "modified", "renamed", "encrypted")
     * @param _ipfsHash IPFS hash of the backed-up file
     */
    function logSecurityEvent(
        string memory _fileHash,
        string memory _eventType,
        string memory _ipfsHash
    ) public {
        // Emit the event
        emit SecurityEvent(
            msg.sender,
            _fileHash,
            _eventType,
            _ipfsHash,
            block.timestamp
        );
        
        // Increment the event counter
        eventCount++;
    }
    
    /**
     * @dev Get the total number of security events logged
     * @return The number of events
     */
    function getEventCount() public view returns (uint256) {
        return eventCount;
    }
    
    /**
     * @dev Transfer ownership of the contract
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be the zero address");
        owner = newOwner;
    }
}