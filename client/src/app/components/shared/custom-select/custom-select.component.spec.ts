import { Pipe, PipeTransform } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";

import { CustomSelectComponent } from "./custom-select.component";

@Pipe({ name: "translate", standalone: true })
class MockTranslatePipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe("CustomSelectComponent", () => {
  let component: CustomSelectComponent;
  let fixture: ComponentFixture<CustomSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomSelectComponent, MockTranslatePipe],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should open and close dropdown", () => {
    expect(component.isOpen).toBeFalse();
    component.toggleOpen();
    expect(component.isOpen).toBeTrue();
    component.toggleOpen();
    expect(component.isOpen).toBeFalse();
  });

  it("should update value and attribute when value property is set", () => {
    fixture.componentRef.setInput("value", "test-val");
    fixture.detectChanges();
    expect(component.value()).toBe("test-val");
    expect(fixture.nativeElement.getAttribute("data-value")).toBe("test-val");

    component.value.set(undefined);
    fixture.detectChanges();
    expect(component.value()).toBeUndefined();
    expect(fixture.nativeElement.hasAttribute("data-value")).toBeFalse();
  });

  it("should support writeValue from ControlValueAccessor", () => {
    component.writeValue("cva-val");
    fixture.detectChanges();
    expect(component.value()).toBe("cva-val");
    expect(fixture.nativeElement.getAttribute("data-value")).toBe("cva-val");
  });
});
