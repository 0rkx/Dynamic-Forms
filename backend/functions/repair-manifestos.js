// Simplified Manifesto Repair Script
// This script repairs the manifesto synchronization between form_manifestos and user_manifesto_context tables

const { createClient } = require('@supabase/supabase-js')

// Get command line args
const args = process.argv.slice(2)
const options = parseArgs(args)

// Main function
async function main() {
  console.log('🔧 Starting manifesto repair operation...')
  
  // Create Supabase client
  const supabaseUrl = options.url || process.env.SUPABASE_URL
  const supabaseKey = options.key || process.env.SUPABASE_SERVICE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase URL or Service Key')
    console.log('   Please provide them as environment variables or command arguments:')
    console.log('   node repair-manifestos.js --url=YOUR_SUPABASE_URL --key=YOUR_SERVICE_KEY')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // Get all form manifestos
  console.log('📋 Fetching all form manifestos...')
  const { data: manifestos, error: fetchError } = await supabase
    .from('form_manifestos')
    .select('*')
  
  if (fetchError) {
    console.error('❌ Error fetching form manifestos:', fetchError)
    process.exit(1)
  }
  
  console.log(`📊 Found ${manifestos.length} manifestos to check`)
  
  // Stats
  let processed = 0
  let repaired = 0
  let failed = 0
  let skipped = 0
  
  // Process each manifesto
  for (const manifesto of manifestos) {
    try {
      processed++
      const formId = manifesto.form_id
      
      // Check if there's already a user_manifesto_context for this form
      const { data: existingContext, error: checkError } = await supabase
        .from('user_manifesto_context')
        .select('id')
        .eq('form_id', formId)
        .maybeSingle()
      
      if (checkError) {
        console.warn(`⚠️  Error checking context for form ${formId}:`, checkError)
        failed++
        continue
      }
      
      if (existingContext) {
        if (!options.force) {
          console.log(`⏩ Form ${formId} already has manifesto context, skipping (use --force to override)`)
          skipped++
          continue
        } else {
          console.log(`🔄 Form ${formId} has existing context but force flag is enabled, repairing...`)
        }
      } else {
        console.log(`🔧 Form ${formId} missing manifesto context, repairing...`)
      }
      
      // Create or update the user_manifesto_context
      const { error: syncError } = await supabase
        .from('user_manifesto_context')
        .upsert({
          form_id: formId,
          product_vision: manifesto.product_vision,
          target_audience: manifesto.target_audience,
          business_goals: manifesto.business_goals || [],
          key_question_areas: manifesto.key_question_areas || [],
          conversation_tone: manifesto.conversation_tone || 'friendly',
          success_metrics: manifesto.success_metrics || [],
          core_values: [], // Default empty array for core_values
          updated_at: new Date().toISOString()
        })
      
      if (syncError) {
        console.error(`❌ Failed to repair form ${formId}:`, syncError)
        failed++
      } else {
        console.log(`✅ Successfully repaired form ${formId}`)
        repaired++
      }
    } catch (e) {
      console.error(`❌ Error processing manifesto:`, e)
      failed++
    }
  }
  
  // Print summary
  console.log('\n📈 Repair Summary:')
  console.log(`   Total manifestos: ${manifestos.length}`)
  console.log(`   Processed: ${processed}`)
  console.log(`   Repaired: ${repaired}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Failed: ${failed}`)
  
  if (failed > 0) {
    console.log('\n⚠️  Some repairs failed. You may want to run the script again with --force flag.')
    process.exit(1)
  } else {
    console.log('\n✅ Repair operation completed successfully!')
    process.exit(0)
  }
}

// Parse command line args
function parseArgs(args) {
  const options = {
    force: false,
    url: null,
    key: null
  }
  
  args.forEach(arg => {
    if (arg === '--force') {
      options.force = true
    } else if (arg.startsWith('--url=')) {
      options.url = arg.substring(6)
    } else if (arg.startsWith('--key=')) {
      options.key = arg.substring(6)
    }
  })
  
  return options
}

// Run the script
main().catch(err => {
  console.error('❌ Unhandled error:', err)
  process.exit(1)
}) 