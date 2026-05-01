// Quick test to check if signUp is properly exported
try {
  const { signUp } = require('./firebase/auth.js');
  console.log('✅ signUp function imported successfully');
  console.log('Type:', typeof signUp);
  if (typeof signUp === 'function') {
    console.log('✅ signUp is a function');
  } else {
    console.log('❌ signUp is not a function');
  }
} catch (error) {
  console.error('❌ Failed to import signUp:', error.message);
}
