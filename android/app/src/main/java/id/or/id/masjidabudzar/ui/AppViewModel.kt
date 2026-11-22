package id.or.id.masjidabudzar.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.or.id.masjidabudzar.AppBundle
import id.or.id.masjidabudzar.PrayerEngine
import id.or.id.masjidabudzar.PrayerRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class AppViewModel(private val repository: PrayerRepository) : ViewModel() {

    val bundle = repository.bundle.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = AppBundle(),
    )

    private val ticker = flow {
        while (true) {
            emit(Unit)
            delay(1_000L)
        }
    }.flowOn(Dispatchers.Default)

    val countdown = combine(bundle, ticker) { b, _ ->
        PrayerEngine.state(
            snapshots = b.snapshots,
            now = b.now(),
            correction = b.hijriCorrection,
            offline = b.offline,
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = null,
    )

    fun refresh() = viewModelScope.launch { repository.refresh() }

    fun setHijriCorrection(value: Int) = viewModelScope.launch {
        repository.settings.setHijriCorrection(value)
    }

    fun setNotificationsEnabled(value: Boolean) = viewModelScope.launch {
        repository.settings.setNotificationsEnabled(value)
    }

    class Factory(private val repository: PrayerRepository) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return AppViewModel(repository) as T
        }
    }
}
