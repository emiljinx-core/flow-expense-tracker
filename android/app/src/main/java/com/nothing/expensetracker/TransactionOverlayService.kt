package com.nothing.expensetracker

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.text.InputType
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.*

class TransactionOverlayService : Service() {

    private lateinit var windowManager: WindowManager
    private var overlayView: View? = null
    private var pendingQueue: PendingQueue? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.d("ExpenseTracker-BG", "TransactionOverlayService: onCreate called")
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        pendingQueue = PendingQueue(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d("ExpenseTracker-BG", "TransactionOverlayService: onStartCommand called")
        val candidateJson = intent?.getStringExtra("candidate")
        Log.d("ExpenseTracker-BG", "TransactionOverlayService: received candidateJson=$candidateJson")
        if (candidateJson != null) {
            try {
                val candidate = TransactionCandidate.fromJson(candidateJson)
                showOverlay(candidate)
            } catch (e: Exception) {
                Log.d("ExpenseTracker-BG", "TransactionOverlayService: Exception parsing/showing overlay", e)
                e.printStackTrace()
                stopSelf()
            }
        } else {
            stopSelf()
        }
        return START_NOT_STICKY
    }

    private fun createFieldLabel(context: Context, text: String): TextView {
        return TextView(context).apply {
            this.text = text.uppercase()
            setTextColor(Color.parseColor("#888888"))
            textSize = 10f
            typeface = Typeface.MONOSPACE
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, 30, 0, 10)
            }
        }
    }

    private fun createInput(context: Context, initialValue: String, hintText: String, isDecimal: Boolean = false): EditText {
        return EditText(context).apply {
            setText(initialValue)
            hint = hintText
            setTextColor(Color.WHITE)
            setHintTextColor(Color.DKGRAY)
            textSize = 14f
            setPadding(30, 30, 30, 30)
            if (isDecimal) {
                inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            }
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#1A1A1A"))
                setStroke(2, Color.parseColor("#333333"))
            }
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        }
    }

    private fun showOverlay(candidate: TransactionCandidate) {
        if (overlayView != null) {
            windowManager.removeView(overlayView)
            overlayView = null
        }

        val context = this
        val isCredit = candidate.type == "credit"
        
        // --- State Variables ---
        var currentSource = "account"
        var currentCategory = candidate.suggestedCategory ?: "Food"

        val root = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#121212"))
            setPadding(50, 50, 50, 50)
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }

        // Header
        val headerRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        }
        
        headerRow.addView(TextView(context).apply {
            text = "${candidate.sourceApp.uppercase()} · NOTIFICATION"
            setTextColor(Color.parseColor("#888888"))
            textSize = 10f
            typeface = Typeface.MONOSPACE
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        })
        
        headerRow.addView(TextView(context).apply {
            text = if (isCredit) "CREDIT" else "DEBIT"
            setTextColor(Color.parseColor("#888888"))
            textSize = 10f
            typeface = Typeface.MONOSPACE
            gravity = Gravity.END
        })
        root.addView(headerRow)

        // Separator
        root.addView(View(context).apply {
            setBackgroundColor(Color.parseColor("#333333"))
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 2).apply { setMargins(0, 20, 0, 20) }
        })
        
        val scrollContainer = ScrollView(context).apply {
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f)
        }
        val formLayout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
        }
        scrollContainer.addView(formLayout)
        root.addView(scrollContainer)

        // Amount Input
        formLayout.addView(createFieldLabel(context, "Amount (editable)"))
        val amountInput = createInput(context, "", (candidate.amount / 100.0).toString(), true)
        amountInput.textSize = 24f
        formLayout.addView(amountInput)

        // Person Input
        var personInput: EditText? = null
        if (!isCredit) {
            formLayout.addView(createFieldLabel(context, "Person / receiver"))
            personInput = createInput(context, "", candidate.counterparty ?: "Enter receiver")
            formLayout.addView(personInput)
            
            // Category
            formLayout.addView(createFieldLabel(context, "Category"))
            val categoryScroll = HorizontalScrollView(context).apply {
                isFillViewport = true
                layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            }
            val categoryRow = LinearLayout(context).apply { orientation = LinearLayout.HORIZONTAL }
            categoryScroll.addView(categoryRow)
            
            val categories = listOf("Food", "Transport", "Shopping", "Education", "Bills")
            val catButtons = mutableListOf<Button>()
            
            for (cat in categories) {
                val btn = Button(context).apply {
                    text = cat.uppercase()
                    textSize = 10f
                    typeface = Typeface.MONOSPACE
                    setPadding(20, 15, 20, 15)
                    layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                        setMargins(0, 0, 15, 0)
                    }
                }
                catButtons.add(btn)
                categoryRow.addView(btn)
            }
            
            fun updateCatButtons() {
                for ((i, cat) in categories.withIndex()) {
                    val btn = catButtons[i]
                    if (cat == currentCategory) {
                        btn.setBackgroundColor(Color.parseColor("#E63946"))
                        btn.setTextColor(Color.WHITE)
                    } else {
                        btn.setBackgroundColor(Color.parseColor("#1A1A1A"))
                        btn.setTextColor(Color.GRAY)
                    }
                }
            }
            
            for ((i, cat) in categories.withIndex()) {
                catButtons[i].setOnClickListener {
                    currentCategory = cat
                    updateCatButtons()
                }
            }
            updateCatButtons()
            formLayout.addView(categoryScroll)
        }

        // Description Input
        formLayout.addView(createFieldLabel(context, if (isCredit) "Source / note" else "Description"))
        val descInput = createInput(context, "", candidate.suggestedDescription ?: if (isCredit) "Salary" else "Enter reason")
        formLayout.addView(descInput)

        // Source Segmented
        formLayout.addView(createFieldLabel(context, if (isCredit) "Add to" else "Payment type"))
        val sourceRow = LinearLayout(context).apply { orientation = LinearLayout.HORIZONTAL }
        val btnAcc = Button(context).apply {
            text = "ACCOUNT"
            textSize = 10f
            typeface = Typeface.MONOSPACE
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }
        val btnCash = Button(context).apply {
            text = "CASH"
            textSize = 10f
            typeface = Typeface.MONOSPACE
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }
        sourceRow.addView(btnAcc)
        sourceRow.addView(btnCash)
        formLayout.addView(sourceRow)

        fun updateSourceBtns() {
            if (currentSource == "account") {
                btnAcc.setBackgroundColor(Color.parseColor("#333333"))
                btnAcc.setTextColor(Color.WHITE)
                btnCash.setBackgroundColor(Color.parseColor("#1A1A1A"))
                btnCash.setTextColor(Color.GRAY)
            } else {
                btnCash.setBackgroundColor(Color.parseColor("#333333"))
                btnCash.setTextColor(Color.WHITE)
                btnAcc.setBackgroundColor(Color.parseColor("#1A1A1A"))
                btnAcc.setTextColor(Color.GRAY)
            }
        }
        btnAcc.setOnClickListener { currentSource = "account"; updateSourceBtns() }
        btnCash.setOnClickListener { currentSource = "cash"; updateSourceBtns() }
        updateSourceBtns()

        // Footer Buttons
        val btnLayout = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, 40, 0, 0)
            }
        }
        
        val btnDismiss = Button(context).apply {
            text = "DISMISS"
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.TRANSPARENT)
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
            setOnClickListener {
                pendingQueue?.acknowledge(listOf(candidate.id))
                stopSelf()
            }
        }
        
        val btnSave = Button(context).apply {
            text = "SAVE"
            setTextColor(Color.WHITE)
            setBackgroundColor(if (isCredit) Color.WHITE else Color.parseColor("#E63946"))
            if (isCredit) setTextColor(Color.BLACK)
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 2f)
            setOnClickListener {
                // Parse edited values
                val editedAmtStr = amountInput.text.toString()
                val parsedAmt = (editedAmtStr.toDoubleOrNull() ?: (candidate.amount / 100.0)) * 100
                
                val finalCandidate = candidate.copy(
                    amount = parsedAmt.toLong(),
                    counterparty = personInput?.text?.toString()?.takeIf { it.isNotBlank() } ?: candidate.counterparty,
                    suggestedCategory = currentCategory,
                    suggestedDescription = descInput.text.toString().takeIf { it.isNotBlank() } ?: candidate.suggestedDescription,
                    paymentSource = currentSource
                )
                
                pendingQueue?.enqueueSaved(finalCandidate)
                pendingQueue?.acknowledge(listOf(candidate.id))
                stopSelf()
            }
        }
        
        btnLayout.addView(btnDismiss)
        btnLayout.addView(btnSave)
        root.addView(btnLayout)

        val wrapper = LinearLayout(context).apply {
            layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#CC000000")) 
            setPadding(40, 40, 40, 40)
            addView(root)
        }

        overlayView = wrapper

        val layoutFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        // Removed FLAG_NOT_FOCUSABLE so that EditTexts can get keyboard focus!
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            layoutFlag,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN, 
            PixelFormat.TRANSLUCENT
        )

        try {
            windowManager.addView(overlayView, params)
            Log.d("ExpenseTracker-BG", "TransactionOverlayService: windowManager.addView success")
        } catch (e: Exception) {
            Log.d("ExpenseTracker-BG", "TransactionOverlayService: Exception in addView", e)
            throw e
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d("ExpenseTracker-BG", "TransactionOverlayService: onDestroy called")
        overlayView?.let {
            windowManager.removeView(it)
        }
    }
}
