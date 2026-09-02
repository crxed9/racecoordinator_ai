import {
  AfterContentInit,
  Component,
  ContentChildren,
  ElementRef,
  forwardRef,
  HostListener,
  input,
  QueryList,
} from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { TranslatePipe } from "@app/pipes/translate.pipe";

@Component({
  standalone: true,
  selector: "app-custom-option",
  template: `<ng-content></ng-content>`,
})
export class CustomOptionComponent {
  value = input<any>(undefined);
  disabled = input<boolean>(false);
  constructor(public elementRef: ElementRef<HTMLElement>) {}

  get label(): string {
    return this.elementRef.nativeElement.textContent?.trim() || "";
  }
}

@Component({
  standalone: true,
  selector: "app-custom-select",
  templateUrl: "./custom-select.component.html",
  styleUrls: ["./custom-select.component.css"],
  imports: [TranslatePipe],
  host: {
    "[attr.id]": "id()",
    "[attr.data-value]": "value",
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomSelectComponent),
      multi: true,
    },
  ],
})
export class CustomSelectComponent
  implements ControlValueAccessor, AfterContentInit
{
  id = input<string>("");
  disabled = input(false);

  @ContentChildren(CustomOptionComponent)
  customOptions!: QueryList<CustomOptionComponent>;

  value: any = null;
  isOpen = false;
  selectedLabel: string = "";

  onChange: any = () => {};
  onTouch: any = () => {};

  constructor(private elementRef: ElementRef) {}

  ngAfterContentInit() {
    this.updateSelectedLabel();
    this.customOptions.changes.subscribe(() => {
      this.updateSelectedLabel();
    });
  }

  updateSelectedLabel() {
    if (!this.customOptions) return;
    const selected = this.customOptions.find(
      (opt) => opt.value() === this.value,
    );
    this.selectedLabel = selected ? selected.label : "";
  }

  writeValue(val: any): void {
    this.value = val;
    this.updateSelectedLabel();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  setDisabledState(_isDisabled: boolean): void {}

  toggleOpen() {
    if (this.disabled()) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.onTouch();
      // Ensure the labels are up to date when opened
      setTimeout(() => this.updateSelectedLabel(), 0);
    }
  }

  selectOption(option: CustomOptionComponent, event: Event) {
    event.stopPropagation();
    this.value = option.value();
    this.selectedLabel = option.label;
    this.onChange(this.value);
    this.isOpen = false;
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }
}
