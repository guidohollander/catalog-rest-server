/**
 * Test script for the new propset_ex API route
 * This script demonstrates how to use the new endpoint that accepts replacement strings
 * instead of complete externals definitions.
 */

const testPropsetEx = async () => {
  // Example usage of the new propset_ex route with multiple replacements
  const testData = {
    req: {
      key: "Test commit message for propset_ex",
      url: "http://your-svn-repo-url/trunk", // Replace with actual SVN URL
      replacements: [
        {
          replacement_from: "old-branch-name-1",
          replacement_to: "new-branch-name-1"
        },
        {
          replacement_from: "old-branch-name-2",
          replacement_to: "new-branch-name-2"
        }
      ]
    }
  };

  try {
    const response = await fetch('http://localhost:3000/api/svn/propset_ex', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    console.log('Response:', result);
    
    if (result.response.success === "1") {
      console.log('✅ propset_ex route is working correctly');
    } else {
      console.log('❌ propset_ex route failed');
    }
  } catch (error) {
    console.error('Error testing propset_ex route:', error);
  }
};

// Run the test
testPropsetEx();
