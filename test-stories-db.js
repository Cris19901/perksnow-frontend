// Quick test to verify Stories database is set up correctly
// Run this in your browser console on your app

console.log('🧪 Testing Stories Database Setup...\n');

// Test 1: Check if get_stories_feed function exists
console.log('Test 1: Calling get_stories_feed()...');
const { data: feedData, error: feedError } = await supabase.rpc('get_stories_feed', {
  p_user_id: null
});

if (feedError) {
  console.error('❌ get_stories_feed ERROR:', feedError);
  console.log('💡 Solution: Re-run CREATE_STORIES_SYSTEM.sql in Supabase');
} else {
  console.log('✅ get_stories_feed works! Returned:', feedData?.length || 0, 'stories');
}

// Test 2: Check if stories table exists
console.log('\nTest 2: Checking stories table...');
const { data: storiesData, error: storiesError } = await supabase
  .from('stories')
  .select('count');

if (storiesError) {
  console.error('❌ stories table ERROR:', storiesError);
  console.log('💡 Solution: Table might not exist. Re-run CREATE_STORIES_SYSTEM.sql');
} else {
  console.log('✅ stories table exists!');
}

// Test 3: Check if story_views table exists
console.log('\nTest 3: Checking story_views table...');
const { data: viewsData, error: viewsError } = await supabase
  .from('story_views')
  .select('count');

if (viewsError) {
  console.error('❌ story_views table ERROR:', viewsError);
  console.log('💡 Solution: Table might not exist. Re-run CREATE_STORIES_SYSTEM.sql');
} else {
  console.log('✅ story_views table exists!');
}

console.log('\n🎯 Test Complete! Check results above.');
