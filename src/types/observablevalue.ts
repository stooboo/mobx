import {Atom} from "../core/atom";
import {checkIfStateModificationsAreAllowed} from "../core/derivation";
import {ValueMode, getValueModeFromValue, makeChildObservable, assertUnwrapped} from "./modifiers";
import {valueDidChange, Lambda} from "../utils/utils";
import {SimpleEventEmitter} from "../utils/simpleeventemitter";

export class ObservableValue<T> extends Atom {
	hasUnreportedChange = false;
	private events: SimpleEventEmitter = null;

	protected value: T = undefined;

	constructor(value: T, protected mode: ValueMode, name = "ObservableValue") {
		super(name);
		const [childmode, unwrappedValue] = getValueModeFromValue(value, ValueMode.Recursive);
		// If the value mode is recursive, modifiers like 'structure', 'reference', or 'flat' could apply
		if (this.mode === ValueMode.Recursive)
			this.mode = childmode;
		this.value = makeChildObservable(unwrappedValue, this.mode, this.name);
	}

	set(newValue: T): boolean {
		assertUnwrapped(newValue, "Modifiers cannot be used on non-initial values.");
		checkIfStateModificationsAreAllowed();
		const oldValue = this.value;
		const changed = valueDidChange(this.mode === ValueMode.Structure, oldValue, newValue);
		if (changed) {
			this.value = makeChildObservable(newValue, this.mode, this.name);
			this.reportChanged();
			if (this.events)
				this.events.emit(newValue, oldValue);
		}
		return changed;
	}

	get(): T {
		this.reportObserved();
		return this.value;
	}

	observe(listener: (newValue: T, oldValue: T) => void, fireImmediately?: boolean): Lambda {
		if (!this.events)
			this.events = new SimpleEventEmitter();
		if (fireImmediately)
			listener(this.value, undefined);
		return this.events.on(listener);
	}

	toString() {
		return `${this.name}@${this.id}[${this.value}]`;
	}
}