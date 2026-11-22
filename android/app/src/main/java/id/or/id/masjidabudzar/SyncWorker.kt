package id.or.id.masjidabudzar

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

class SyncWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val repository = PrayerRepository(applicationContext)
        val result = repository.refresh()
        return if (result.isSuccess) {
            PrayerReminderScheduler.scheduleNext(applicationContext, repository)
            PrayerReminderService.start(applicationContext)
            Result.success()
        } else {
            Result.retry()
        }
    }

    companion object {
        private const val NAME = "masjid_abu_dzar_sync"

        fun enqueue(context: Context) {
            val request = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(networkConstraint())
                .build()
            WorkManager.getInstance(context.applicationContext)
                .enqueueUniquePeriodicWork(NAME, ExistingPeriodicWorkPolicy.KEEP, request)
        }

        fun enqueueNow(context: Context) {
            val request = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(networkConstraint())
                .build()
            WorkManager.getInstance(context.applicationContext)
                .enqueueUniqueWork("$NAME-now", ExistingWorkPolicy.KEEP, request)
        }

        private fun networkConstraint() = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
    }
}
